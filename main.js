game_log("---Script Start---");
//Put monsters you want to kill in here
//If your character has no target, it will travel to a spawn of the first monster in the list below.
var monster_targets = ["crab"];

var currentActivity = "";
var currentTarget = null;

var mininumPotionsToHaveOnHand = 50; //T e number of potions at which to do a resupply run.

//Movement And Attacking
setInterval(function () {
	
	//Determine what state we should be in.
	currentActivity = determineWhatToDo();
	
	//Switch statement decides what we should do based on the value of 'state'
	switch(currentActivity)
	{
		case "Kill Monsters":
			killMonsters();
			break;
		case "Resupply Health Potions":
			resupplyHealthPotions();
			break;
		case "Resupply Mana Potions":
			resupplyManaPotions();
			break;
	}
}, 500); //Execute 2 times per second


function determineWhatToDo()
{
	//Default to farming
	if(currentActivity == "")
	{
		return "Kill Monsters";
	}

	var numberOfHealthPotionsCurrentlyHeld = num_items("hpot0");
	if(numberOfHealthPotionsCurrentlyHeld < 50)
	{
		return "Resupply Health Potions";
	}

	var numberOfManaPotionsCurrentlyHeld = num_items("mpot0");
	if(numberOfManaPotionsCurrentlyHeld < 50)
	{
		return "Resupply Mana Potions";
	}

	return "Kill Monsters";
}

//This function contains our logic for when we're farming mobs
function killMonsters()
{
	loot();

    //Heal With Potions if we're below 75% hp.
    if (character.hp / character.max_hp < 0.5 || character.mp / character.max_mp < 0.5) {
        use_hp_or_mp();
    }

/*
	var target=get_targeted_monster();
	if(!target)
	{
		target=get_nearest_monster({min_xp:100,max_att:120});
		if(target) change_target(target);
		else
		{
			set_message("No Monsters");
			return;
		}
	}
	
	if(!in_attack_range(target))
	{
		move(
			character.x+(target.x-character.x)/2,
			character.y+(target.y-character.y)/2
			);
		// Walk half the distance
	}
	else if(can_attack(target))
	{
		set_message("Attacking");
		attack(target);
	}
*/

	//Attack or move to target

    if (get_target()) 
    {
        if (distance_to_point(currentTarget.real_x, currentTarget.real_y) < character.range) {
            if (can_attack(currentTarget)) 
            {
                attack(currentTarget);
            }
        }
        else 
        {
            move_to_target(currentTarget);
        }
	}
	else
	{
		if (!smart.moving) 
		{
			game_log("finding a target");
            smart_move({ to: monster_targets[0] });
            findNewMonsterToKill();
        }
	}
}

function findNewMonsterToKill()
{
	currentTarget = find_viable_targets()[0];
	change_target(currentTarget);
}

//This function contains our logic during resupply runs
function resupplyHealthPotions()
{
	var potion_merchant = get_npc("fancypots");
	
	var distance_to_merchant = null;
	
	if(potion_merchant != null) 
	{
		distance_to_merchant = distance_to_point(potion_merchant.position[0], potion_merchant.position[1]);
	}
	
	if (!smart.moving 
		&& (distance_to_merchant == null || distance_to_merchant > 250)) {
            smart_move({ to:"potions"});
    }
	
	if(distance_to_merchant != null 
	   && distance_to_merchant < 250)
	{
		buy_potions();
	}
}

function resupplyManaPotions()
{
	var potion_merchant = get_npc("fancypots");
	
	var distance_to_merchant = null;
	
	if(potion_merchant != null) 
	{
		distance_to_merchant = distance_to_point(potion_merchant.position[0], potion_merchant.position[1]);
	}
	
	if (!smart.moving 
		&& (distance_to_merchant == null || distance_to_merchant > 250)) {
            smart_move({ to:"potions"});
    }
	
	if(distance_to_merchant != null 
	   && distance_to_merchant < 250)
	{
		buy_potions();
	}
}

//Buys potions until the amount of each potion_type we defined in the start of the script is above the min_potions value.
function buy_potions()
{
	var potionTypes = ["hpot0", "mpot0"];
	var purchaseAmount = 5;

	if(empty_slots() > 0)
	{
		for(typeID in potionTypes)
		{
			var type = potionTypes[typeID];
			
			var item_def = parent.G.items[type];
			
			if(item_def != null)
			{
				var cost = item_def.g * purchaseAmount;

				if(character.gold >= cost)
				{
					var num_potions = num_items(type);

					if(num_potions < mininumPotionsToHaveOnHand)
					{
						buy(type, purchaseAmount);
					}
				}
				else
				{
					game_log("Not Enough Gold!");
				}
			}
		}
	}
	else
	{
		game_log("Inventory Full!");
	}
}


//Returns the number of items in your inventory for a given item name;
function num_items(name)
{
	var item_count = character.items.filter(item => item != null && item.name == name).reduce(function(a,b){ return a + (b["q"] || 1);
	}, 0);
	
	return item_count;
}

//Returns how many inventory slots have not yet been filled.
function empty_slots()
{
	return character.esize;
}

//Gets an NPC by name from the current map.
function get_npc(name)
{
	var npc = parent.G.maps[character.map].npcs.filter(npc => npc.id == name);
	
	if(npc.length > 0)
	{
		return npc[0];
	}
	
	return null;
}

//Returns the distance of the character to a point in the world.
function distance_to_point(x, y) {
    return Math.sqrt(Math.pow(character.real_x - x, 2) + Math.pow(character.real_y - y, 2));
}

//This function will ether move straight towards the target entity,
//or utilize smart_move to find their way there.
function move_to_target(target) {
    if (can_move_to(target.real_x, target.real_y)) {
        smart.moving = false;
        smart.searching = false;
        move(
            character.real_x + (target.real_x - character.real_x) / 2,
            character.real_y + (target.real_y - character.real_y) / 2
        );
    }
    else {
        if (!smart.moving) {
            smart_move({ x: target.real_x, y: target.real_y });
        }
    }
}

//Returns an ordered array of all relevant targets as determined by the following:
////1. The monsters' type is contained in the 'monsterTargets' array.
////2. The monster is attacking you or a party member.
////3. The monster is not targeting someone outside your party.
//The order of the list is as follows:
////Monsters attacking you or party members are ordered first.
////Monsters are then ordered by distance.
function find_viable_targets() {
    var monsters = Object.values(parent.entities).filter(
        mob => (mob.target == null
                    || parent.party_list.includes(mob.target)
                    || mob.target == character.name)
                && (mob.type == "monster"
                    && (parent.party_list.includes(mob.target)
                        || mob.target == character.name))
                    || monster_targets.includes(mob.mtype));

    for (id in monsters) {
        var monster = monsters[id];

        if (parent.party_list.includes(monster.target)
                    || monster.target == character.name) {
            monster.targeting_party = 1;
        }
        else {
            monster.targeting_party = 0;
        }
    }

    //Order monsters by whether they're attacking us, then by distance.
    monsters.sort(function (current, next) {
        if (current.targeting_party > next.targeting_party) {
            return -1;
        }
        var dist_current = distance(character, current);
        var dist_next = distance(character, next);
        // Else go to the 2nd item
        if (dist_current < dist_next) {
            return -1;
        }
        else if (dist_current > dist_next) {
            return 1
        }
        else {
            return 0;
        }
    });
    return monsters;
}