def calculate_severity(
    nodule_count,
    coverage_percent,
    patch_percent
):

    # Cap all inputs at 100%
    coverage_percent = min(coverage_percent, 100)
    patch_percent = min(patch_percent, 100)

    # Nodule Score: 10 nodules = 100%
    nodule_score = min(
        (nodule_count / 10) * 100,
        100
    )

    severity = (
        0.4 * nodule_score +
        0.4 * coverage_percent +
        0.2 * patch_percent
    )

    return round(min(severity, 100), 2)