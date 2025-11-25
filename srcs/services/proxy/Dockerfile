FROM node:24

EXPOSE 8080

WORKDIR /data

COPY ./entrypoint.sh /
RUN    chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["npm", "start"]
