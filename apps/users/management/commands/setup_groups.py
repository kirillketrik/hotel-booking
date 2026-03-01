from django.core.management import BaseCommand
from django.contrib.auth.models import Group, Permission


class Command(BaseCommand):
    def __init__(self, *args, **kwargs):
        super(Command, self).__init__(*args, **kwargs)

    help = "Create default groups and permissions"

    def handle(self, *args, **options):
        from apps.users.roles import PERMISSIONS_MAP
        # Loop groups
        for group_name, models_dict in PERMISSIONS_MAP.items():
            group, created = Group.objects.get_or_create(name=group_name)

            # Loop models in group
            for model_cls, permissions in models_dict.items():

                for perm_index, perm_name in enumerate(permissions):
                    codename = perm_name + "_" + model_cls.split(".")[-1]

                    try:
                        perm = Permission.objects.get(codename=codename)
                        group.permissions.add(perm)
                        self.stdout.write("Adding "
                                          + codename
                                          + " to group "
                                          + group.__str__())
                    except Permission.DoesNotExist:
                        self.stdout.write(codename + " not found")
