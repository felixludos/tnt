

import sys, os, time
import numpy as np
import pickle
import networkx as nx
import tnt_util as util
from tnt_util import adict, idict, xset, collate, load, render_dict, get_object, save
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple

_PHASES = {
	'setup': setup_phase,
}
def get_phase(phase_name):
	return _PHASES[phase_name]

CURRENT_PHASE = None
ACTIVE_PHASE = None # this is the phase
G = None # current game state



