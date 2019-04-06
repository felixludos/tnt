
from werkzeug.routing import BaseConverter

class ActionConverter(BaseConverter):

    def to_python(self, value):
        return tuple(value.split('+'))

    def to_url(self, values):
        return '+'.join(BaseConverter.to_url(value)
                        for value in values)