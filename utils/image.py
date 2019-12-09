import os
from typing import List

import cv2
import numpy as np


def process_cut_middle(images: List[np.ndarray], options: dict) -> List[np.ndarray]:
    cut_middle = options.get('cutMiddle')
    discard_first = options.get('discardFirst')

    if not cut_middle:
        return images

    output_images = []
    for img in images:
        height, width = img.shape[:2]
        cut = round(width / 2)
        if discard_first:
            output_images.append(img[:, cut:])
        else:
            output_images.extend([
                img[:, :cut],
                img[:, cut:]
            ])
    return output_images


def process_fit_max_size(images: List[np.ndarray], options: dict) -> List[np.ndarray]:
    fit_max_height = options.get('fitMaxHeight')
    fit_max_width = options.get('fitMaxWidth')

    if not fit_max_height and not fit_max_width:
        return images

    output_images = []
    for img in images:
        img_height, img_width = img.shape[:2]
        scale = 1
        if fit_max_height and img_height > fit_max_height:
            scale = min(scale, fit_max_height / img_height)
        if fit_max_width and img_width > fit_max_width:
            scale = min(scale, fit_max_width / img_width)
        if scale < 1:
            output_images.append(cv2.resize(img, dsize=None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA))
    return output_images


def write_images(images: List[np.ndarray], ext: str, work_dir: str) -> List[str]:
    output_paths = []
    for i, img in enumerate(images):
        output_path = os.path.join(work_dir, 'output_%d%s' % (i, ext))
        cv2.imwrite(output_path, img)
        output_paths.append(output_path)
    return output_paths


def process_image(img_path: str, options: dict, work_dir: str) -> List[str]:
    ext = os.path.splitext(img_path)[-1]
    img = cv2.imread(img_path)

    images = process_cut_middle([img], options)
    images = process_fit_max_size(images, options)
    return write_images(images, ext, work_dir)
