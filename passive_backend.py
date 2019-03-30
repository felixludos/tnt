

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
	'Setup': setup_phase,

    'New Year': None,
    'Production': None,
    'Government': None,
    'Spring': None,
    'Summer': None,
    'Blockade': None,
    'Fall': None,
    'Winter': None,

    'Land Combat': None,
    'Naval Combat': None,
}
def get_phase(phase_name):
	phase = _PHASES[phase_name]
	if phase is None:
		raise NotImplementedError
	return phase

CURRENT_PHASE = None
ACTIVE_PHASE = None # this is the phase



