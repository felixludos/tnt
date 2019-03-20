import sys, os, time
import numpy as np
#import matplotlib.pyplot as plt
import yaml
import networkx as nx
import uuid
from IPython.display import display_javascript, display_html, display
import json


class xdict_keysiterator(object):
    def __init__(self, itr):
        self._itr = itr
    def __iter__(self):
        return self
    def __next__(self):
        k = next(self._itr)
        if k == '_id':
            return next(self._itr)
        return k
class xdict_keys(object):
    def __init__(self, view):
        self._view = view
    def __iter__(self):
        return xdict_keysiterator(iter(self._view))
    def __repr__(self):
        return 'xdict_keys({})'.format(', '.join(repr(k) for k in iter(self)))

class xdict_itemsiterator(object):
    def __init__(self, itr):
        self._itr = itr
    def __iter__(self):
        return self
    def __next__(self):
        i = next(self._itr)
        if i[0] == '_id':
            return next(self._itr)
        return i
class xdict_items(object):
    def __init__(self, view):
        self._view = view
    def __iter__(self):
        return xdict_itemsiterator(iter(self._view))
    def __repr__(self):
        return 'xdict_items({})'.format(', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in iter(self)))

class xdict_valuesiterator(object):
    def __init__(self, itr):
        self._itr = itr
    def __iter__(self):
        return self
    def __next__(self):
        k, v = next(self._itr)
        if k == '_id':
            return next(self._itr)[1]
        return v
class xdict_values(object):
    def __init__(self, view):
        self._view = view
    def __iter__(self):
        return xdict_valuesiterator(iter(self._view))
    def __repr__(self):
        return 'xdict_values({})'.format(', '.join(repr(v) for v in iter(self)))

def condensed_str(x):
    if isinstance(x, xdict):
        s = []
        for k in x.keys():
            if isinstance(k, dict):
                s.append('{...}')
            elif isinstance(k, list):
                s.append('[...]')
            else:
                s.append(str(k))
        return 'xdict({})'.format(', '.join(s))
    elif isinstance(x, list):
        s = []
        for k in x:
            if isinstance(k, dict):
                s.append('{...}')
            elif isinstance(k, list):
                s.append('[...]')
            else:
                s.append(str(k))
        return '[{}]'.format(', '.join(s))
    return str(x)

_object_table = dict()
def get_object(ID):
    return _object_table[ID]

def save(data, path):
    yaml.dump(uncollate(data), open(path,'w'),
              default_flow_style=False)

_dict_ID = 0
class xdict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        global _dict_ID
        if '_id' in self:
            if self._id in _object_table:
                print('WARNING: Overwriting id={}'.format(self._id))
            _object_table[self._id] = self
        else:
            while _dict_ID in _object_table:
                _dict_ID += 1
            self._id = _dict_ID
            _object_table[self._id] = self
            _dict_ID += 1
    def __getattr__(self, key):
        return super().__getitem__(key)
    def __setattr__(self, key, value):
        return super().__setitem__(key, value)
    # def __missing__(self, key):
    #     return None
    def __eq__(self, other):
        return self._id == other._id
    def __hash__(self):
        return self._id
    def __iter__(self):
        return iter(self.keys())
    def __delattr__(self, item):
        return super().__delitem__(item)
    def __del__(self):
        try:
            del _object_table[self._id]
        except KeyError:
            pass
    def __getstate__(self):
        return super().__getstate__()
    def copy(self):
        return xdict((k,v) for k,v in self.items())
    def keys(self):
        return xdict_keys(super().keys())
    def values(self):
        return xdict_values(super().items())
    def items(self):
        return xdict_items(super().items())
    def full_items(self):
        return super().items()
    def to_dict(self, with_id=True):
        if with_id:
            return dict(self.full_items())
        return dict(self.items())
    def __str__(self):
        items = []
        for k,v in self.items():
            items.append( '{}:{}'.format(str(k), condensed_str(v)) )
        return 'xdict({})'.format(', '.join(items))
    def __repr__(self):
        return '{'+', '.join('{}:{}'.format(repr(k),repr(v)) for k,v in self.items())+'}'

_set_ID = 0
class xset(set):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        global _set_ID
        self._id = _set_ID
        _set_ID += 1
    def __eq__(self, other):
        return self._id == other._id
    def __hash__(self):
        return self._id

def collate(raw):
    if isinstance(raw, dict) and type(raw) != xdict:
        return xdict((collate(k),collate(v)) for k,v in raw.items())
    elif isinstance(raw, list):
        return [collate(x) for x in raw]
    elif isinstance(raw, tuple):
        return (collate(x) for x in raw)
    elif isinstance(raw, set) and type(raw) != xset:
        return xset(collate(x) for x in raw)
    elif isinstance(raw, str):
        return raw.replace(' ', '_')
    return raw

def uncollate(raw, with_id=True):
    if isinstance(raw, xdict):
        return dict((uncollate(k,with_id),uncollate(v,with_id))
                    for k,v in raw.full_items())
    elif isinstance(raw, list):
        return [uncollate(x,with_id) for x in raw]
    elif isinstance(raw, tuple):
        return (uncollate(x,with_id) for x in raw)
    elif isinstance(raw, set) and type(raw) != xset:
        return set(uncollate(x,with_id) for x in raw)
    # elif isinstance(raw, str):
    #     return raw.replace('_', ' ')
    return raw

def load(path):
    return collate(yaml.load(open(path, 'r')))

def render_format(raw):
    if isinstance(raw, dict):
        return dict((str(k),render_format(v)) for k,v in raw.items())
    elif isinstance(raw, list) or isinstance(raw, set):
        itr = dict()
        for i, el in enumerate(raw):
            itr['el_{}'.format(i)] = render_format(el)
        return itr
    return str(raw)

class render_dict(object):
    def __init__(self, json_data):
    
        self.json_str = render_format( json_data )
        
        # if isinstance(json_data, dict):
        #     self.json_str = json_data
        #     #self.json_str = json.dumps(json_data)
        # else:
        #     self.json_str = json
        self.uuid = str(uuid.uuid4())

    def _ipython_display_(self):
        display_html('<div id="{}" style="height: 600px; width:100%;"></div>'.format(self.uuid),
            raw=True
        )
        display_javascript("""
        require(["https://rawgit.com/caldwell/renderjson/master/renderjson.js"], function() {
          renderjson.set_show_to_level(1)
          document.getElementById('%s').appendChild(renderjson(%s))
        });
        """ % (self.uuid, self.json_str), raw=True)












