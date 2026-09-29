#!/usr/bin/env python3
"""
Regression tests for how tools/audit.py reads the <img alt> attribute.

The parser must tell three states apart:

    absent            <img src=x>                → alt is None  → "missing"
    present, empty    <img src=x alt> / alt=""   → alt == ""    → "empty"
    present, text     <img src=x alt="Logo">     → alt == "Logo" → "present"

The bug these guard against: html.parser reports a valueless attribute as
("alt", None), and audit.py put the attributes in a dict and read a.get("alt")
— so a valueless alt and a missing alt were both None, and every minified
<img ... alt ...> (Hugo drops the quotes from alt="") was reported missing.

What this does NOT test, and audit.py does not decide: whether an empty alt is
the right choice for a given image. That depends on what the image is for and
what surrounds it, and needs a human or a browser accessibility tree. A pass
here means "the attribute was read correctly", nothing more.

Usage:  python3 tools/test_audit_alt.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audit import PageParser  # noqa: E402
try:
    from audit import classify_alt  # noqa: E402
except ImportError:          # older audit.py: the classification cases then fail on their own
    classify_alt = None


def alts(html):
    p = PageParser()
    p.feed(html)
    p.close()
    return [img["alt"] for img in p.images]


class AltAttributeParsing(unittest.TestCase):

    # ---- the three states
    def test_absent(self):
        self.assertEqual(alts('<img src="example.png">'), [None])

    def test_bare_attribute_is_present_and_empty(self):
        self.assertEqual(alts('<img src="example.png" alt>'), [""])

    def test_double_quoted_empty(self):
        self.assertEqual(alts('<img src="example.png" alt="">'), [""])

    def test_single_quoted_empty(self):
        self.assertEqual(alts("<img src=\"example.png\" alt=''>"), [""])

    def test_meaningful_text(self):
        self.assertEqual(alts('<img alt="Meaningful description" src="example.png">'),
                         ["Meaningful description"])

    # ---- ordering, minification, unquoted values
    def test_bare_alt_first(self):
        self.assertEqual(alts('<img alt src="example.png">'), [""])

    def test_bare_alt_between_other_attributes(self):
        self.assertEqual(alts('<img width=1 alt height=2 src=example.png>'), [""])

    def test_minified_hugo_output(self):
        # exactly what the blog's minifier emits for the site logo
        html = ('<a href=/ class="btn-click magnetic"><span class=brand-mark><img '
                'src=https://zero2one.sa/assets/icons/logo-z2o.webp width=167 height=77 alt '
                'fetchpriority=high> <span class=brand-label>ZERO 2 ONE</span></span></a>')
        self.assertEqual(alts(html), [""])

    def test_unquoted_value(self):
        self.assertEqual(alts('<img src=example.png alt=Logo>'), ["Logo"])

    def test_self_closing(self):
        self.assertEqual(alts('<img src="example.png" alt="" />'), [""])

    def test_uppercase_markup(self):
        self.assertEqual(alts('<IMG SRC=example.png ALT>'), [""])

    def test_first_alt_wins_like_a_browser(self):
        self.assertEqual(alts('<img alt="first" alt="second" src=example.png>'), ["first"])

    # ---- things that contain "alt" but are not the alt attribute
    def test_data_alt_is_not_alt(self):
        self.assertEqual(alts('<img src="example.png" data-alt="x">'), [None])

    def test_attribute_name_ending_in_alt_is_not_alt(self):
        self.assertEqual(alts('<img src="example.png" salt="1">'), [None])

    def test_alt_in_another_value_is_not_alt(self):
        self.assertEqual(alts('<img src="alt.png" title="alt text">'), [None])

    def test_several_images_keep_their_own_state(self):
        self.assertEqual(alts('<img src=a.png><img src=b.png alt><img src=c.png alt=C>'), [None, "", "C"])


class Classification(unittest.TestCase):

    def test_states(self):
        self.assertIsNotNone(classify_alt, "audit.classify_alt does not exist")
        self.assertEqual(classify_alt(None), "missing")
        self.assertEqual(classify_alt(""), "empty")
        self.assertEqual(classify_alt("   "), "empty")
        self.assertEqual(classify_alt("Logo"), "present")


if __name__ == "__main__":
    unittest.main(verbosity=2)
