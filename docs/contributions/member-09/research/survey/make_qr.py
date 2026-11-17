#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成问卷二维码。

用法:
    python make_qr.py                      # 用默认 URL
    python make_qr.py https://your.url     # 指定 URL
    python make_qr.py https://your.url out.png

依赖:
    pip install "qrcode[pil]"

说明:
    微信扫码只是用内置浏览器打开二维码里的网址，没有额外要求。
    换问卷平台或换托管地址后，重新运行本脚本即可，二维码内容就是那个网址。
"""

import sys
import qrcode
from qrcode.constants import ERROR_CORRECT_M

# 默认指向 GitHub Pages 上的问卷页面。
# 若改用问卷星/腾讯问卷，把它换成对应的问卷链接。
DEFAULT_URL = "https://amen-ai36.github.io/soff/docs/contributions/member-09/research/survey/"


def make(url: str, out: str = "survey-qr.png") -> None:
    qr = qrcode.QRCode(
        version=None,              # 自动选择最小够用的版本
        error_correction=ERROR_CORRECT_M,  # 约 15% 容错，适合印刷和屏幕
        box_size=10,               # 每个点 10px，打印足够清晰
        border=4,                  # 静默区，低于 4 会影响识别率
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(out)

    print(f"二维码已生成: {out}")
    print(f"尺寸: {img.size[0]}x{img.size[1]} px")
    print(f"指向: {url}")
    print()
    print("请用手机实际扫一次，确认能打开页面再拿去发放。")


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    out = sys.argv[2] if len(sys.argv) > 2 else "survey-qr.png"
    make(url, out)
