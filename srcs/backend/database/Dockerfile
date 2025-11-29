FROM node:24

EXPOSE 3000

WORKDIR /data

COPY ./entrypoint.sh /
RUN    chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["npm", "start"]
