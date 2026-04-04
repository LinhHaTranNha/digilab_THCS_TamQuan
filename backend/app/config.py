import ast
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ENV_FILE = Path(__file__).resolve().parents[1] / '.env'


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)

    parsed = urlsplit(database_url)
    query = dict(parse_qsl(parsed.query))

    if 'render.com' in parsed.hostname and 'sslmode' not in query:
        query['sslmode'] = 'require'

    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


def load_env_file() -> dict[str, str]:
    if not ENV_FILE.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in ENV_FILE.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def parse_cors_origins(raw_value: str | None) -> list[str]:
    default_origins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ]

    if not raw_value:
        return default_origins

    try:
        parsed = ast.literal_eval(raw_value)
    except (ValueError, SyntaxError):
        parsed = None

    if isinstance(parsed, list) and all(isinstance(item, str) for item in parsed):
        return parsed

    return [origin.strip() for origin in raw_value.split(',') if origin.strip()] or default_origins


@dataclass(frozen=True)
class Settings:
    app_name: str = 'Digital Library API'
    api_prefix: str = '/api'
    secret_key: str = 'digital-library-secret-key'
    database_url: str = ''
    nvidia_api_base_url: str = 'https://integrate.api.nvidia.com/v1'
    nvidia_api_key: str = ''
    nvidia_model: str = 'meta/llama-3.1-70b-instruct'
    ai_request_timeout_seconds: int = 45
    ai_max_response_tokens: int = 1024
    ai_candidate_limit: int = 15
    ai_max_question_length: int = 500
    cors_origin_regex: str = r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'
    cors_origins: list[str] = field(default_factory=lambda: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ])

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)


@lru_cache
def get_settings() -> Settings:
    env_values = load_env_file()
    database_url = os.getenv('DATABASE_URL') or env_values.get('DATABASE_URL', '')

    if not database_url:
        raise RuntimeError('DATABASE_URL is missing. Set it in environment variables or backend/.env.')

    return Settings(
        app_name=os.getenv('APP_NAME') or env_values.get('APP_NAME', 'Digital Library API'),
        api_prefix=os.getenv('API_PREFIX') or env_values.get('API_PREFIX', '/api'),
        secret_key=os.getenv('SECRET_KEY') or env_values.get('SECRET_KEY', 'digital-library-secret-key'),
        database_url=database_url,
        nvidia_api_base_url=os.getenv('NVIDIA_API_BASE_URL') or env_values.get('NVIDIA_API_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        nvidia_api_key=os.getenv('NVIDIA_API_KEY') or env_values.get('NVIDIA_API_KEY', ''),
        nvidia_model=os.getenv('NVIDIA_MODEL') or env_values.get('NVIDIA_MODEL', 'meta/llama-3.1-70b-instruct'),
        ai_request_timeout_seconds=int(os.getenv('AI_REQUEST_TIMEOUT_SECONDS') or env_values.get('AI_REQUEST_TIMEOUT_SECONDS', '30')),
        ai_max_response_tokens=int(os.getenv('AI_MAX_RESPONSE_TOKENS') or env_values.get('AI_MAX_RESPONSE_TOKENS', '700')),
        ai_candidate_limit=int(os.getenv('AI_CANDIDATE_LIMIT') or env_values.get('AI_CANDIDATE_LIMIT', '10')),
        ai_max_question_length=int(os.getenv('AI_MAX_QUESTION_LENGTH') or env_values.get('AI_MAX_QUESTION_LENGTH', '500')),
        cors_origin_regex=os.getenv('CORS_ORIGIN_REGEX') or env_values.get('CORS_ORIGIN_REGEX', r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'),
        cors_origins=parse_cors_origins(os.getenv('CORS_ORIGINS') or env_values.get('CORS_ORIGINS')),
    )
