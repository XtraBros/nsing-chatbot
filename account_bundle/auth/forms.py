"""Forms related to authentication (log in and register)"""

from flask_wtf import FlaskForm
from wtforms import BooleanField, PasswordField, StringField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Regexp, ValidationError

from account_bundle.models import User


class LoginForm(FlaskForm):
    """Login details"""
    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    remember_me = BooleanField("Remember Me")
    submit = SubmitField("Sign In")


class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=64)])
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
        ],
    )
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_username(self, field):
        if User().get_by_username(field.data):
            raise ValidationError("Username is already taken.")


class LogoutForm(FlaskForm):
    submit = SubmitField("Log out")
