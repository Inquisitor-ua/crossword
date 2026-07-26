from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('c/<uuid:crossword_id>/', views.shared_crossword, name='shared_crossword'),
    path('api/generate/', views.generate, name='generate'),
    path('api/crossword/<uuid:crossword_id>/', views.get_crossword, name='get_crossword'),
]
