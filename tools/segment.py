"""Segment a catalog page into article blocks around each heading code."""

import numpy as np
from PIL import Image
from scipy import ndimage

INK_THRESHOLD = 200
# generous dilation so a drawing, its dimension lines, its code and its
# property table merge into a single connected block
DILATE_X = 22
DILATE_Y = 14


def ink_mask(image: Image.Image) -> np.ndarray:
    grey = np.asarray(image.convert("L"))
    return grey < INK_THRESHOLD


def block_labels(mask: np.ndarray) -> tuple[np.ndarray, int]:
    dilated = ndimage.binary_dilation(
        mask, structure=np.ones((DILATE_Y, DILATE_X), dtype=bool)
    )
    return ndimage.label(dilated)


def block_for(
    labels: np.ndarray, count: int, box: tuple[int, int, int, int]
) -> tuple[int, int, int, int] | None:
    """Return the bounding box of the block covering the given pixel box."""
    x0, y0, x1, y1 = box
    window = labels[y0:y1, x0:x1]
    ids, counts = np.unique(window[window > 0], return_counts=True)
    if ids.size == 0:
        return None
    target = int(ids[int(np.argmax(counts))])
    slices = ndimage.find_objects(labels == target)[0]
    return (
        int(slices[1].start),
        int(slices[0].start),
        int(slices[1].stop),
        int(slices[0].stop),
    )
