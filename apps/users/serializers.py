from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.users.models import User


class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, validators=[password_validation.validate_password]
    )
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "password", "password2")

    def validate_password(self, value):
        password_validation.validate_password(value, self.instance)
        return value

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError("Пароли не совпадают")
        return data


class LoginUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "password")



class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='name'
    )

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "groups")
        read_only_fields = ("id", "email", "groups")
