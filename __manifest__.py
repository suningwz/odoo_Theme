# -*- coding: utf-8 -*-
#################################################################################
# Author      : Kanak Infosystems LLP. (<http://kanakinfosystems.com/>)
# Copyright(c): 2012-Present Kanak Infosystems LLP.
# All Rights Reserved.
#
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#
# You should have received a copy of the License along with this program.
# If not, see <http://kanakinfosystems.com/license>
#################################################################################

{
    'name': "Odoo Shoppe Backend Theme",
    'version': '13.0.0.3',
    'summary': 'Odoo Backend Theme v13',
    'description': """
Odoo Shoppe Backend Theme
================================
    """,
    'license': 'OPL-1',
    'author': "Kanak Infosystems LLP.",
    'website': "http://www.kanakinfosystems.com",
    'images': [
        'static/description/banner.gif',
        'static/description/odooshoppe_backend_theme_screenshot.jpg'
    ],
    'category': 'Theme/Backend',
    'depends': ['web_editor', 'mail'],
    'data': [
        'data/data.xml',
        'security/ir.model.access.csv',
        'views/top_menu_templates.xml',
        'views/side_menu_templates.xml',
        'views/ir_ui_view_views.xml',
    ],
    'qweb': [
         'static/src/xml/*.xml',
    ],
    'application': True,
    # 'price': 150,
    # 'currency': 'EUR',
    'live_test_url': '',
}
