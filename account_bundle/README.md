# Account Bundle

Drop-in Flask authentication bundle for Ragflow-backed registration/login.

## Contents
- Blueprint, routes, and providers in `account_bundle/auth/`
- Templates in `account_bundle/templates/`
- Static assets in `account_bundle/static/`
- Environment template in `account_bundle/.env.example`

## Quick Start
1) Copy `account_bundle/` into your Flask project.
2) Install dependencies: `pip install -r requirements.txt`
3) Configure `.env` using `account_bundle/.env.example`
4) Initialize in your Flask app:

```python
from account_bundle import init_app as init_account_management

app = Flask(__name__)
init_account_management(app, url_prefix="/auth")
```

## Frontend Hook
Point your “Sign in” button to `/auth/login?popup=1&next=/close` to open the auth UI in a popup and return to your app on success.
