#!/bin/sh
sed "s|MIMIR_URL_PLACEHOLDER|${MIMIR_URL}|g" /etc/tempo.yaml.tmpl > /etc/tempo.yaml
exec /tempo -config.file=/etc/tempo.yaml -target=all
