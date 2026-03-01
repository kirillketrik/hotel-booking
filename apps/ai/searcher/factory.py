from django.conf import settings
from django.utils.module_loading import import_string


def get_ai_searcher():
    config = settings.AI_CONFIG
    class_path = config["searcher"]
    ai_class = import_string(class_path)
    return ai_class(**config["kwargs"])