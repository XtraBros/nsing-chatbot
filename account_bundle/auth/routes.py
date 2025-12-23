"""Routes module for authentication. This module handles all authentication/encryption related functions."""

from account_bundle import login, csrf
from account_bundle.auth import bp
from account_bundle.auth.forms import LoginForm, LogoutForm, RegistrationForm
from account_bundle.models import User
from werkzeug.urls import url_parse
from flask import render_template, flash, redirect, url_for, request, jsonify, current_app
from flask_login import current_user, login_user, logout_user, login_required


def _default_redirect_target():
    return current_app.config.get("ACCOUNT_BUNDLE_DEFAULT_REDIRECT", "/")


def _resolve_next():
    next_page = request.values.get('next')
    if next_page and url_parse(next_page).netloc == '':
        return next_page
    return _default_redirect_target()


@login.user_loader
def load_user(username):
    user = User().get_by_username(username)
    if not user:
        return None
    return User(username=user["name"], email=user.get("email"))


@bp.get("/status")
def auth_status():
    if current_user.is_authenticated:
        return jsonify({"authenticated": True, "username": current_user.get_id()})
    return jsonify({"authenticated": False, "username": None})


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Main login logic."""
    if current_user.is_authenticated:
        return redirect(_resolve_next())

    login_form = LoginForm()
    popup_mode = request.args.get("popup") == "1" or request.form.get("popup") == "1"
    if login_form.validate_on_submit():
        user = User().get_by_username(username=login_form.username.data)
        if user is not None and User.check_password(hashed_password=user["password"], password=login_form.password.data):
            print("Password validated.")
            print(f"ID: '{user['_id']}' - Username: '{user['name']}' logging in.")
            user_obj = User(username=user["name"], email=user.get("email"))
            login_user(user_obj, remember=login_form.remember_me.data)
            next_page = _resolve_next()
            return redirect(next_page)
        else:
            print(f"User '{login_form.username.data}' entered invalid credentials.")
            flash("Invalid username or password")

    return render_template('login.html', title='Sign In', login_form=login_form)


@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    form = LogoutForm()
    if form.validate_on_submit():
        logout_user()
        flash("You have been logged out.")
    else:
        flash("Invalid logout request.")
    return redirect(_default_redirect_target())


@bp.route('/api/logout', methods=['POST'])
@csrf.exempt
@login_required
def api_logout():
    logout_user()
    return jsonify({"authenticated": False})


@bp.route('/register', methods=['GET', 'POST'])
def register():

    if current_user.is_authenticated:
        return redirect(_default_redirect_target())

    form = RegistrationForm()

    if form.validate_on_submit():
        user = User(username=form.username.data, email=form.email.data, password=form.password.data)
        # Hashing the password here
        user.set_password(password=form.password.data)
        try:
            # Saving into database
            user.register()
        except ValueError as exc:
            flash(str(exc))
            return render_template('register.html', title='Register', form=form)
        flash('Congratulations, you are now a registered user!')
        query_params = {}
        if request.args.get("popup") == "1":
            query_params["popup"] = "1"
        next_value = request.args.get("next")
        if next_value:
            query_params["next"] = next_value
        login_url = url_for('auth.login', **query_params)
        return redirect(login_url)

    return render_template('register.html', title='Register', form=form)
