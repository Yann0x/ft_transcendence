docker-compose-path := srcs/docker-compose.yaml

all : run

run : init front 
	docker compose -f $(docker-compose-path) up -d --build

down :
	docker compose -f $(docker-compose-path) down

logs :
	docker compose -f $(docker-compose-path) logs


clean :

	docker rm $$(docker ps -aq)

fclean: down clean
	docker rmi $$(docker image ls -aq)

re : fclean all

init:
	./setup.sh

devfront: down
	cd srcs/frontend/data && npm install && npm run dev
front:
	cd srcs/frontend/data && npm install && npm run build

.PHONY: all run clean fclean re
.IGNORE: clean fclean re