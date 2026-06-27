import json 
import unicodedata


# Load json File 
def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_moves(move_names: list, moves_db: dict) -> list:
    """技名から技DataListにConvert"""
    return [moves_db[name] for name in move_names if name in moves_db]


# あるポケモンのある技がそのポケモンに対して効果がどうか確認するもの, すべての数字を合計する
def calc_effectiveness(move_type: str, defender_types, type_chart, ability_data=None):
    """
    move_type       : "Fire"などの技のType
    defender_types   : ["Dragon", "Ground"]などの相手のType
    type_chart      : dict
    """
    # ふしぎなまもりは無視で
    
    # 特性による倍率補正
    ability_multiplier = 1.0
    if ability_data:
        type_multiplier = ability_data.get("type_multiplier", {})
        ability_multiplier = type_multiplier.get(move_type, 1.0)

    multiplier = 1.0
    for def_type in defender_types:
        # Fire.Dragon -> Fireの中にDragonなかったら1.0
        multiplier *= type_chart.get(move_type, {}).get(def_type, 1.0) 

    return multiplier * ability_multiplier
    

# あるTeam側のPokemonの技が、あるPokemonに対してどれだけ有効かを計算する
def calc_compatibility(move_types: list, defender_pokemon: dict, type_chart, ability_data):
    defender_types = defender_pokemon.get("types", {})
    score = 0
    for move_type in move_types:
        score += calc_effectiveness(move_type, defender_types, type_chart, ability_data)
    return score


def get_enemy_pokemon() -> str:
    return input("Type pokemon name: ")

def to_katakana(text: str) -> str:
    return "".join(
        chr(ord(c) + 0x60) if "ぁ" <= c <= "ん" else c
        for c in text
    )


def main():
    # load data
    type_chart_db = load_json("data/type_compatibility.json")
    pokemon_db = load_json("data/pokemon.json")
    my_party_db = load_json("data/my_party.json")
    moves_db = load_json("data/moves.json")
    ability_db = load_json("data/abilities.json")

    for my_party in my_party_db:
        my_party["moves"] = resolve_moves(my_party["moves"], moves_db)


    while (1):
        enemy_pokemon = to_katakana(get_enemy_pokemon())
        if enemy_pokemon == "": return
        enemy_pokemon_data = pokemon_db.get(enemy_pokemon, {})
        if enemy_pokemon_data == {}: print("No Info")
        
        else:
            enemy_pokemon_data["moves"] = resolve_moves(enemy_pokemon_data["moves"], moves_db)

            recommendation_order_attack = []
            recommendation_order_defend = []
            recommendation_order_overall = []

            for my_pokemon in my_party_db:
                # 一匹のPokemonがenemy_pokemon_dataに入っている、それに対してTeamのPokemonの誰が一番有利に働けるかを計算
                # 攻撃面
                move_types = [move["type"] for move in my_pokemon["moves"]]
                enemy_ability_name = enemy_pokemon_data.get("abilities", [None])[0]  # 最初の特性
                enemy_ability_data = ability_db.get(enemy_ability_name, {})
                score_attack = calc_compatibility(move_types, enemy_pokemon_data, type_chart_db, enemy_ability_data)
                recommendation_order_attack.append({"name": my_pokemon["name"], "score": score_attack})


                # 防御面
                # 相手のMovesTypeに対して自分のPokemonのTypeを計算
                move_types = [move["type"] for move in enemy_pokemon_data.get("moves", [])]
                my_ability_name = my_pokemon.get("abilities", [None])[0]
                my_ability_data = ability_db.get(my_ability_name, {})
                score_defend = calc_compatibility(move_types, my_pokemon, type_chart_db, my_ability_data)
                recommendation_order_defend.append({"name": my_pokemon["name"], "score": score_defend})

                # 攻撃はそのまま、防御は小さければいいので+1して逆数に
                overall_score = score_attack + 1 / (score_defend+1)
                recommendation_order_overall.append({"name": my_pokemon["name"], "score": overall_score})
            
            # Ascending Orderに
            recommendation_order_attack.sort(key=lambda x: x["score"], reverse=True)
            recommendation_order_overall.sort(key=lambda x: x["score"], reverse=True)
            # Descending Orderに
            recommendation_order_defend.sort(key=lambda x: x["score"], reverse=False)
            
            
            # Printing outputs
            print(f"\n相手: {enemy_pokemon}")
            print("-"*30)

            print("\n攻撃面でのRecommendation")
            for i, p in enumerate(recommendation_order_attack, 1):
                print(f"    {i}. {p['name']:<12} score: {p['score']:.2f}")
            #print(recommendation_order_attack)  # 降順にsort

            print("\n防御面でのRecommendation")
            for i, p in enumerate(recommendation_order_defend, 1):
                print(f"    {i}. {p['name']:<12} score: {p['score']:.2f}")
            #print(recommendation_order_defend)  # 昇順にsort

            
            print("\nTotalでのRecommendation")
            for i, p in enumerate(recommendation_order_overall, 1):
                print(f"    {i}. {p['name']:<12} score: {p['score']:.2f}\n")
            #print(recommendation_order_overall)   # 両方計算
       
if __name__ == "__main__":
    main()