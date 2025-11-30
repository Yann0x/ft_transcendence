docker-compose-path := srcs/docker-compose.yaml

all : run

run : init front build
	docker compose -f $(docker-compose-path) up -d

build : init front 
	docker compose -f $(docker-compose-path) build

down :
	docker compose -f $(docker-compose-path) down

restart: down run

logs :
	docker compose -f $(docker-compose-path) logs


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
nodeclean: fclean
	find -type d -name data -exec sh -c 'cd "{}" && npm run fclean' \;

.PHONY: all run clean fclean re
.IGNORE: clean fclean re nodeclean