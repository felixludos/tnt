import pygame as pg
import cairosvg as csvg
from _front.front_pygame.pygame_settings import *

import os

""" Class for loading in game img files and creating rects to represent them
on the map. """


class GameObjectLoader:

    def __init__(self):
        self.imgs = None

    def load_game_imgs(self):
        imgs = {}
        imgs["AirForce"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "AirForce.svg"))).convert()
        imgs["Axis"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Axis.svg"))).convert()
        imgs["Carrier"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Carrier.svg"))).convert()
        imgs["Fleet"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Fleet.svg"))).convert()
        imgs["Fortress1"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Fortress.1.svg"))).convert()
        imgs["Fortress"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Fortress.svg"))).convert()
        imgs["Infantry"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Infantry.svg"))).convert()
        imgs["Submarine"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Submarine.svg"))).convert()
        imgs["Tank"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "Tank.svg"))).convert()
        imgs["USSR"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "USSR.svg"))).convert()
        imgs["West"] = pg.image.load(self.convert_svg(os.path.join(*IMG_PATH, "West.svg"))).convert()
        self.imgs = imgs
        return self.imgs

    def convert_svg(self, img):
        return csvg.svg2png(img)
