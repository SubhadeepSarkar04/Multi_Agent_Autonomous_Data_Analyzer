"""
URL Configuration for backend_project.
"""

from django.urls import include, path

urlpatterns = [
    path("", include("api.urls")),
]
