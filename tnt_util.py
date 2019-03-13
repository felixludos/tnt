import sys, os, time
import numpy as np
#import matplotlib.pyplot as plt
import yaml
import networkx as nx


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
    def __missing__(self, key):
        return None
    def __eq__(self, other):
        return self._id == other._id
    def __hash__(self):
        return self._id
    def __iter__(self):
        return iter(self.keys())
    def copy(self):
        return xdict((k,v) for k,v in self.items())
    def keys(self):
        return xdict_keys(super().keys())
    def values(self):
        return xdict_values(super().items())
    def items(self):
        return xdict_items(super().items())

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
        return xdict((k,collate(v)) for k,v in raw.items())
    elif isinstance(raw, list):
        return [collate(x) for x in raw]
    elif isinstance(raw, tuple):
        return (collate(x) for x in raw)
    elif isinstance(raw, set) and type(raw) != xset:
        return xset(collate(x) for x in raw)
    return raw

def load(path):
    return collate(yaml.load(open(path, 'r')))

def load_map(tiles='config/tiles.yml', borders='config/borders.yml'):
    tiles = load(tiles)
    borders = load(borders)
    
    G = nx.Graph()
    G.add_edges_from((b['tile1'], b['tile2'], {'type':b['type']}) for b in borders)
    G.add_nodes_from((k, v) for k,v in tiles.items())
    return G














