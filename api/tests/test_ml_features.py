from ml.features import extract, FEATURE_NAMES


def test_extract_returns_list():
    result = extract({"target_word": "ocean", "guess_word": "tide", "similarity_score": 0.27})
    assert isinstance(result, list)


def test_extract_single_feature():
    result = extract({"target_word": "ocean", "guess_word": "tide", "similarity_score": 0.27})
    assert len(result) == 1


def test_extract_similarity_passthrough():
    result = extract({"target_word": "ocean", "guess_word": "tide", "similarity_score": 0.27})
    assert result[0] == 0.27


def test_extract_similarity_as_float():
    # similarity_score may come from DB as string — ensure float cast works
    result = extract({"target_word": "ocean", "guess_word": "tide", "similarity_score": "0.27"})
    assert result[0] == 0.27


def test_feature_names_matches_vector_length():
    result = extract({"target_word": "ocean", "guess_word": "tide", "similarity_score": 0.5})
    assert len(result) == len(FEATURE_NAMES)


def test_feature_names_contains_similarity():
    assert "similarity_score" in FEATURE_NAMES
