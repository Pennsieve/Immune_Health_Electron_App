#!/bin/bash

DEBUG=0

CONFIG_PROD_CLIENT_ID=670mo7si81pcc3sfub7o1914d8
CONFIG_DEV_CLIENT_ID=703lm5d8odccu21pagcfjkeaea

AUTH_FLOW=USER_PASSWORD_AUTH
CLIENT_ID=

while [ "$1" != "" ]
do
  case $1 in
    --client-id )
      CLIENT_ID=$2
      shift;;
    --debug )
      DEBUG=1;
      ;;
    -d | --dev | --non-prod )
      CLIENT_ID=$CONFIG_DEV_CLIENT_ID
      ;;
    -w | --pass | --passwd | --password )
      PASSWORD=$2
      shift;;
    -p | --prod | --production )
      CLIENT_ID=$CONFIG_PROD_CLIENT_ID
      ;;
    -u | --user | --username )
      USERNAME=$2
      shift;;
  esac
  shift
done

if [ "$CLIENT_ID" == "" ]
then
  echo "Usage: `basename $0` [ --dev | --prod | --client-id nnnn ] [--username nnn] [--password nnn]"
  exit 1
fi

while [ "$USERNAME" == "" ]
do
  read -p "Username: " USERNAME
done

while [ "$PASSWORD" == "" ]
do
  read -sp "Password: " PASSWORD
done

if [ $DEBUG -eq 1 ]
then
  echo "CLIENT_ID: $CLIENT_ID"
  echo "USERNAME: $USERNAME"
  echo "PASSWORD: $PASSWORD"
fi

aws cognito-idp initiate-auth --auth-flow $AUTH_FLOW --client-id $CLIENT_ID --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD
