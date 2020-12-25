# -*- coding: utf-8 -*-

from odoo import fields, models, api
from odoo import modules
import base64
from odoo.http import request


class ResCompany(models.Model):
    _inherit = 'res.company'

    def get_default_img(self):
        with open(
            modules.get_module_resource(
                'odoo_shoppe_backend_theme', 'static/src/img/cover', 'cover_black.jpg'
                ), 'rb') as f:
            return base64.b64encode(f.read())

    @api.model
    def set_background_cover(self):
        image_base64 = self.get_default_img()
        companies = self.sudo().search([])
        for company in companies:
            company.app_background_image = image_base64
            company.bg_img = image_base64

    app_background_image = fields.Binary("App Background Image", default=get_default_img)
    app_background_color = fields.Char("App Background Color")
    is_app_background_color = fields.Boolean("Show App Background Color")

    is_sidebar_bg_img = fields.Boolean("Show Sidebar Background Image",  default=False)
    bg_img = fields.Binary("Sidebar Background Image", default=get_default_img)

    menu_style = fields.Selection([
        ('apps', 'Top Menu'),
        ('sidemenu', 'Side Collapse Menu'),
        ('fullmenu', 'Side Expand Menu')
    ], string="Menu Style", default="sidemenu")
    font_name = fields.Selection([
        ('inherit', 'Default'),
        ('Open Sans Light', 'Open Sans Light'),
        ('"Roboto", sans-serif', 'Roboto'),
        ('Open Sans', 'Open Sans'),
        ('monospace', 'Monospace'),
        ('serif', 'Serif')
    ], string="Select Font", default='inherit')
    button_style = fields.Selection([
        ('default_button_odoo', 'Default'),
        ('corner_button_odoo', 'Corner'),
        ('thin_button_odoo', 'Thin'),
        ('round_button_odoo', 'Round')
    ], default="default_button_odoo", string="Button Style")
    tabs_style = fields.Selection([
        ('horizontal', 'Horizontal Tab'),
        ('vertical', 'Vertical Tab')
    ], string="Tabs Style", default='horizontal')
    icon_style = fields.Selection([
        ('default_odoo_icon', 'Default'),
        ('3d_odoo_icon', '3D Icon'),
    ], default="default_odoo_icon", string="Icon Bundle")
    is_dark_mode = fields.Boolean(string="Enabled Night Mode")


class Http(models.AbstractModel):
    _inherit = 'ir.http'

    def session_info(self):
        res = super(Http, self).session_info()
        user = request.env.user
        res['tabs_style'] = user.company_id.tabs_style if user.company_id else False
        return res
