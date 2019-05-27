
import sys, os, time
import random
import numpy as np
seed = 10
RNG = random.Random(seed)
random.seed(seed)
np.random.seed(seed)

import util as util
from util import adict, idict, xset, collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
from itertools import chain, product
from util.tnt_units import load_unit_rules
import tnt_setup as setup

from flask_app import *

print(ping())

# if False:
out = format_msg_to_python(init_game(debug=True, player='Axis', seed=seed))

print(out.actions)

G = get_G()
print(G.cards.action.deck)
print(G.cards.investment.deck)
# print(G.random.count)
# print(G.random.log)

