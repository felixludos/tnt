'''import tnt_util as util
from tnt_util import adict, idict, xset, collate, load, render_dict, save, Logger, seq_iterate
from tnt_setup import init_gamestate, setup_phase
from tnt_cards import load_card_decks, draw_cards
from collections import namedtuple
import random
from itertools import chain, product
from tnt_units import load_unit_rules


import tnt_setup as setup
'''
from flask_app import *

import pygame as pg
from camera import *
from _front.front_pygame.pygame_settings import *


class PGame:
    def __init__(self):
        pg.init()
        self.width = WIN_WIDTH
        self.height = WIN_HEIGHT
        win_info = pg.display.Info()
        self.screen_width = win_info.current_w
        self.screen_height = win_info.current_h
        self.win = pg.display.set_mode((self.width, self.height), pg.RESIZABLE)
        self.clock = pg.time.Clock()
        pg.display.set_caption("Triumph and Tragedy")
        pg.mouse.set_visible(True)
        self.running = True
        self.load_data()

    def load_data(self):
        self.map = pg.image.load(os.path.join(*GAME_MAP_PATH)).convert() # Load map


    def new(self):
        # set background
        self.win.blit(self.map, self.map.get_rect())


        # set up camera
        self.camera = Camera(self.width, self.height)

        # Apply changes to the game window
        pg.display.update()
        self.run()

    def run(self):
        self.playing = True
        while self.playing:
            self.events()

    def events(self):
        # PROCESS INPUTS
        for event in pg.event.get():
            # check if the user closes the game
            if event.type == pg.QUIT:
                if self.playing:
                    self.playing = False
                self.running = False

            # Handle pausing
            if event.type == pg.KEYDOWN:
                if event.key == pg.K_ESCAPE:
                    self.pause()

            # Handle clicking
            self.mouse_pos = pg.mouse.get_pos()
            if event.type == pg.MOUSEBUTTONDOWN and event.button == 1:
                print(str(self.mouse_pos))

            # Handle window resizing
            if event.type == pg.VIDEORESIZE:
                old_content = self.win
                self.width = event.w
                self.height = event.h # Update the display properties
                self.win = pg.display.set_mode((self.width, self.height), pg.RESIZABLE)
                self.win.blit(old_content, (0,0))
                self.camera.update_map(self.width, self.height) # Update the camera properties
                del old_content

    def pause(self):
        pass


def main():
    p = PGame()

    while p.running:
        p.new()


if __name__ == '__main__':
    main()
