from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "local"
    demo_mode: bool = True
    app_db_url: str = "sqlite:///./data/app.db"
    artifact_dir: str = "./artifacts"
    samples_dir: str = "./samples"

    ssb_db_dialect: str = "mysql"
    ssb_db_host: str = ""
    ssb_db_port: int = 3306
    ssb_db_user: str = ""
    ssb_db_password: str = ""
    ssb_db_name: str = ""
    ssb_db_charset: str = "utf8mb4"

    llm_provider: str = "deepseek"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "deepseek-v4-flash"
    vision_model: str = "configured-vision-model"

    image_provider: str = "agnes"
    image_base_url: str = "https://apihub.agnes-ai.com"
    image_api_key: str = ""
    image_model: str = "agnes-image-2.1-flash"

    search_provider: str = "tavily"
    search_base_url: str = "https://api.tavily.com"
    search_api_key: str = ""

    budget_target_rmb: float = 1500.0
    usd_to_rmb: float = 7.2
    llm_input_usd_per_million: float = 0.30
    llm_output_usd_per_million: float = 1.20
    image_generation_usd: float = 0.003
    search_request_usd: float = 0.005
    cache_ttl_hours: int = 24
    max_image_retries: int = 2

    @property
    def app_db_path(self) -> Path:
        if self.app_db_url.startswith("sqlite:///"):
            return Path(self.app_db_url.replace("sqlite:///", "", 1))
        return Path("./data/app.db")

    @property
    def db_configured(self) -> bool:
        return bool(self.ssb_db_host and self.ssb_db_user and self.ssb_db_password)

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key)

    @property
    def image_configured(self) -> bool:
        return bool(self.image_api_key)

    @property
    def search_configured(self) -> bool:
        return bool(self.search_api_key)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    Path(settings.artifact_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.samples_dir).mkdir(parents=True, exist_ok=True)
    settings.app_db_path.parent.mkdir(parents=True, exist_ok=True)
    return settings
