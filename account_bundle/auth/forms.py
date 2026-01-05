"""Forms related to authentication (log in and register)"""

from flask_wtf import FlaskForm
from wtforms import BooleanField, PasswordField, StringField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Regexp, ValidationError


class LoginForm(FlaskForm):
    """Login details"""
    email = StringField(
        "Email",
        validators=[
            DataRequired(),
            Email(message="Please enter a valid email address."),
            Length(max=255),
        ],
    )
    password = PasswordField("Password", validators=[DataRequired()])
    remember_me = BooleanField("Remember Me")
    submit = SubmitField("Sign In")


class RegistrationForm(FlaskForm):
    username = StringField(
        "Username",
        validators=[
            DataRequired(),
            Length(min=2, max=64),
            Regexp(regex=r"^[A-Za-z0-9_.-]+$", message="Username can use letters, numbers, . _ -"),
        ],
    )
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=255)])
    password = PasswordField(
        'Password',
        validators=[
            DataRequired(),
            Length(min=8, message="Password must be at least 8 characters."),
            Regexp(
                regex=r"^(?=.*[A-Za-z])(?=.*\d).+$",
                message="Password must contain letters and numbers.",
            ),
            Regexp(
                regex=r'^[^"\'\\/]+$',
                message='Password cannot include quotes or slashes.',
            ),
        ],
    )
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')


class LogoutForm(FlaskForm):
    submit = SubmitField("Log out")
