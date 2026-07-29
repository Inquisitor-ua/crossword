import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .crossword import generate_crossword
from .models import SavedCrossword


def index(request):
    return render(request, 'index.html', {'is_shared_view': False})


def shared_crossword(request, crossword_id):
    return render(
        request,
        'index.html',
        {
            'is_shared_view': True,
            'crossword_id': crossword_id,
        },
    )


def _validate_entries(entries):
    if not entries:
        return 'Add at least one word'
    if len(entries) < 2:
        return 'At least 2 words are required to generate a crossword'
    for entry in entries:
        word = str(entry.get('word', '')).strip()
        clue = str(entry.get('clue', '')).strip()
        if not word or not clue:
            return 'Every word must have both text and a clue'
        if not word.replace(' ', '').isalpha():
            return f'The word "{word}" must contain letters only'
    return None


@csrf_exempt
@require_http_methods(['POST'])
def generate(request):
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    entries = payload.get('words', [])
    validation_error = _validate_entries(entries)
    if validation_error:
        return JsonResponse({'error': validation_error}, status=400)

    result = generate_crossword(entries)
    if result is None:
        return JsonResponse(
            {
                'error': (
                    'Could not build a crossword from these words. '
                    'Try adding words that share common letters.'
                )
            },
            status=422,
        )

    saved = SavedCrossword.objects.create(
        data=result,
        words=entries,
    )
    share_url = request.build_absolute_uri(
        reverse('shared_crossword', args=[saved.id])
    )

    return JsonResponse(
        {
            **result,
            'id': str(saved.id),
            'share_url': share_url,
        }
    )


@require_http_methods(['GET'])
def get_crossword(request, crossword_id):
    saved = get_object_or_404(SavedCrossword, pk=crossword_id)
    share_url = request.build_absolute_uri(
        reverse('shared_crossword', args=[saved.id])
    )
    return JsonResponse(
        {
            **saved.data,
            'id': str(saved.id),
            'share_url': share_url,
            'words': saved.words,
        }
    )
