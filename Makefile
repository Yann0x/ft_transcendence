docker-compose-path := srcs/docker-compose.yaml

all : run

run : init front build
	docker compose -f $(docker-compose-path) up -d

build : down init front 
	docker compose -f $(docker-compose-path) build

down :
	docker compose -f $(docker-compose-path) down

restart: down run

logs :
	docker compose -f $(docker-compose-path) logs -f $(filter-out $@,$(MAKECMDGOALS))

test :
	docker exec -it $(filter-out $@,$(MAKECMDGOALS)) npm run test


clean : down
	docker rm $$(docker ps -aq)

fclean: clean
	docker rmi $$(docker image ls -aq)

re : fclean all

init:
	./setup.sh

devfront:
	cd srcs/frontend/data && npm install && npm run dev
front:
	cd srcs/frontend/data && npm install && npm run build


# <--- DEV TOOLS--->
nodeclean: down 
	find -type d -name data -exec sh -c 'cd "{}" && npm run fclean' \;

.PHONY: all run clean fclean re
.IGNORE: clean fclean re nodeclean