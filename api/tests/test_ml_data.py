from ml.data import _aggregate_positives, train_val_split, MIN_VOTES


def _make_row(target, guess, user_id, similarity=0.25, user_label=True):
    return {
        "target_word": target,
        "guess_word": guess,
        "user_id": user_id,
        "similarity_score": similarity,
        "user_label": user_label,
    }


# ─── _aggregate_positives ────────────────────────────────────────────────────

def test_below_min_votes_excluded():
    rows = [_make_row("ocean", "tide", f"user_{i}") for i in range(MIN_VOTES - 1)]
    assert _aggregate_positives(rows) == []


def test_exactly_min_votes_included():
    rows = [_make_row("ocean", "tide", f"user_{i}") for i in range(MIN_VOTES)]
    result = _aggregate_positives(rows)
    assert len(result) == 1


def test_same_user_counts_once():
    # MIN_VOTES rows all from same user — should not qualify
    rows = [_make_row("ocean", "tide", "user_1") for _ in range(MIN_VOTES)]
    assert _aggregate_positives(rows) == []


def test_same_user_plus_others_counts_correctly():
    # 2 votes from user_1 + 1 from user_2 = 2 distinct users, below MIN_VOTES=3
    rows = [
        _make_row("ocean", "tide", "user_1"),
        _make_row("ocean", "tide", "user_1"),
        _make_row("ocean", "tide", "user_2"),
    ]
    assert _aggregate_positives(rows) == []


def test_similarity_averaged_across_votes():
    rows = [
        _make_row("ocean", "tide", "user_1", similarity=0.20),
        _make_row("ocean", "tide", "user_2", similarity=0.30),
        _make_row("ocean", "tide", "user_3", similarity=0.40),
    ]
    result = _aggregate_positives(rows)
    assert len(result) == 1
    assert abs(result[0]["similarity_score"] - 0.30) < 1e-9


def test_non_thumbed_up_rows_excluded():
    rows = [_make_row("ocean", "tide", f"user_{i}", user_label=False) for i in range(MIN_VOTES)]
    assert _aggregate_positives(rows) == []


def test_multiple_pairs_independent():
    ocean_rows = [_make_row("ocean", "tide", f"user_{i}") for i in range(MIN_VOTES)]
    river_rows = [_make_row("river", "stream", f"user_{i}") for i in range(MIN_VOTES)]
    result = _aggregate_positives(ocean_rows + river_rows)
    assert len(result) == 2


# ─── train_val_split ─────────────────────────────────────────────────────────

def test_split_ratio():
    X = list(range(100))
    y = [i % 2 for i in range(100)]
    X_train, y_train, X_val, y_val = train_val_split(X, y, val_fraction=0.2)
    assert len(X_train) == 80
    assert len(X_val) == 20


def test_split_no_overlap():
    X = list(range(100))
    y = [0] * 100
    X_train, _, X_val, _ = train_val_split(X, y)
    assert set(X_train).isdisjoint(set(X_val))


def test_split_covers_all_samples():
    X = list(range(50))
    y = [0] * 50
    X_train, _, X_val, _ = train_val_split(X, y)
    assert len(X_train) + len(X_val) == 50


def test_split_labels_aligned():
    X = list(range(10))
    y = list(range(10))  # label == index for easy verification
    X_train, y_train, X_val, y_val = train_val_split(X, y)
    for x, label in zip(X_train, y_train):
        assert x == label
    for x, label in zip(X_val, y_val):
        assert x == label
