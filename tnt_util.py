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

_dict_ID = 0
class xdict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        global _dict_ID
        self._id = _dict_ID
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
    def copy(self):
        return xdict((k,v) for k,v in self.items())
    def keys(self):
        return xdict_keys(super().keys())
    def values(self):
        return xdict_values(super().items())
    def items(self):
        return xdict_items(super().items())
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

def load(path):
    return collate(yaml.load(open(path, 'r')))

def load_map(tiles='config/tiles.yml', borders='config/borders.yml'):
    G = xdict()
    
    tiles = load(tiles)
    borders = load(borders)

    for b in borders:
        n1, n2 = b.tile1, b.tile2
        t = b.type
    
        if 'borders' not in tiles[n1]:
            tiles[n1].borders = xdict()
        tiles[n1].borders[n2] = t
    
        if 'borders' not in tiles[n2]:
            tiles[n2].borders = xdict()
        tiles[n2].borders[n1] = t
        
    G.tiles = tiles
    
    return G

def render_format(raw):
    if isinstance(raw, dict):
        return dict((str(k),render_format(v)) for k,v in raw.items())
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












