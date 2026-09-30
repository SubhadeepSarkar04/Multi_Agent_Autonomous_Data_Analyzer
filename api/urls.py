"""
api/urls.py

URL patterns for the AutoML API endpoints.
"""

from django.urls import re_path
from api import views

urlpatterns = [
    re_path(r"^run/?$", views.start_run, name="start_run"),
    re_path(r"^runs/?$", views.runs_collection, name="runs_collection"),
    re_path(r"^runs/(?P<run_id>[^/]+)/?$", views.delete_single_run, name="delete_single_run"),
    re_path(r"^runs/(?P<run_id>[^/]+)/status/?$", views.get_status, name="get_status"),
    re_path(r"^runs/(?P<run_id>[^/]+)/artifacts/(?P<filename>.+)$", views.get_artifact, name="get_artifact"),
    re_path(r"^runs/(?P<run_id>[^/]+)/model/?$", views.get_model, name="get_model"),
    re_path(r"^runs/(?P<run_id>[^/]+)/pause/?$", views.pause_pipeline, name="pause_pipeline"),
    re_path(r"^runs/(?P<run_id>[^/]+)/resume/?$", views.resume_pipeline, name="resume_pipeline"),
    re_path(r"^runs/(?P<run_id>[^/]+)/stop/?$", views.stop_pipeline, name="stop_pipeline"),
    re_path(r"^runs/(?P<run_id>[^/]+)/rerun/?$", views.rerun_pipeline, name="rerun_pipeline"),
    re_path(r"^runs/(?P<run_id>[^/]+)/execute_code/?$", views.execute_custom_code, name="execute_custom_code"),
]
