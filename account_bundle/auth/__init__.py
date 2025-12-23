"""Blueprint initialisation"""

from flask import Blueprint

bp = Blueprint(
    "auth",
    __name__,
    template_folder="../templates",
    static_folder="../static",
)

from account_bundle.auth import routes
