"""Reusable account management bundle for Flask apps."""

from flask_login import LoginManager
from flask_wtf import CSRFProtect

login = LoginManager()
login.login_view = 'auth.login'
login.session_protection = "strong"
csrf = CSRFProtect()


def init_app(app, *, url_prefix="/auth"):
    """Register account management blueprints and extensions on an existing Flask app."""
    login.init_app(app)
    csrf.init_app(app)

    from account_bundle.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix=url_prefix)

    return app


from account_bundle import models  # noqa: E402,F401
