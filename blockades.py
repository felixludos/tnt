

from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit
from tnt_util import travel_options, eval_tile_control
from government import check_revealable, reveal_tech
import random

# def evaluate_supplies(G, player):
# 	pass
#
# def evaluate_blockades(G, player):
# 	pass


def blockade_phase(G):
	raise NotImplementedError

def supply_phase(G):
	raise NotImplementedError

