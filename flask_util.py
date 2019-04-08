
from werkzeug.routing import BaseConverter

class ActionConverter(BaseConverter):

    def to_python(self, value):
        out = []
        for v in value.split('+'):
            try:
                out.append(int(v))
            except:
                out.append(v)
        return tuple(out)

    def to_url(self, values):
        return '+'.join(BaseConverter.to_url(value)
                        for value in values)