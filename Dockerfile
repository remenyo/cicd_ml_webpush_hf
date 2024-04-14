# build with this command:
# docker build . --file Dockerfile --progress plain -o build

FROM ruby:3.3 as base

RUN apt-get update
RUN apt-get install -y curl unzip
RUN apt-get install -y libgmp-dev default-jre

# for chrome -> for pupeteer -> for mermaid
RUN apt-get install -y libgbm-dev \
	ca-certificates \
	fonts-liberation \
	libasound2 \
	libatk-bridge2.0-0 \
	libatk1.0-0 \
	libc6 \
	libcairo2 \
	libcups2 \
	libdbus-1-3 \
	libexpat1 \
	libfontconfig1 \
	libgbm1 \
	libgcc1 \
	libglib2.0-0 \
	libgtk-3-0 \
	libnspr4 \
	libnss3 \
	libpango-1.0-0 \
	libpangocairo-1.0-0 \
	libstdc++6 \
	libx11-6 \
	libx11-xcb1 \
	libxcb1 \
	libxcomposite1 \
	libxcursor1 \
	libxdamage1 \
	libxext6 \
	libxfixes3 \
	libxi6 \
	libxrandr2 \
	libxrender1 \
	libxss1 \
	libxtst6 \
	lsb-release \
	wget \
	xdg-utils

RUN apt-get remove nodejs
RUN rm -rf /usr/local/bin/node*
RUN rm -rf /usr/local/bin/npm*
RUN rm -rf /etc/apt/sources.list.d/nodesource.list

RUN curl -fsSL https://deb.nodesource.com/setup_21.x | bash
RUN apt-get install -y nodejs

RUN node --version
RUN npm --version

RUN gem install asciidoctor
RUN gem install asciidoctor-pdf
RUN gem install asciidoctor-bibtex
RUN gem install asciidoctor-diagram

RUN gem install hexapdf rouge --no-document

RUN npm install -g @mermaid-js/mermaid-cli

# --- pupeteer patch

# Rename original mmdc to mmdc-original
RUN mv /usr/bin/mmdc /usr/bin/mmdc-original

# Create a new mmdc script
RUN echo '#!/usr/bin/env bash' > /usr/local/bin/mmdc && \
	echo 'DEFAULT_CONFIG='"'"'{"args":["--no-sandbox"]}'"'"'' >> /usr/local/bin/mmdc && \
	echo 'for arg in "$@"; do' >> /usr/local/bin/mmdc && \
	echo '  if [[ "$arg" == -p=* ]]; then' >> /usr/local/bin/mmdc && \
	echo '    CONFIG_FILE=${arg#-p=}' >> /usr/local/bin/mmdc && \
	echo '    if [ -f "$CONFIG_FILE" ]; then' >> /usr/local/bin/mmdc && \
	echo '      jq ".args += [\"--no-sandbox\"]" "$CONFIG_FILE" > /tmp/modified_puppeteer_config.json' >> /usr/local/bin/mmdc && \
	echo '      CONFIG_ARG="-p /tmp/modified_puppeteer_config.json"' >> /usr/local/bin/mmdc && \
	echo '      break' >> /usr/local/bin/mmdc && \
	echo '    fi' >> /usr/local/bin/mmdc && \
	echo '  fi' >> /usr/local/bin/mmdc && \
	echo 'done' >> /usr/local/bin/mmdc && \
	echo 'if [ -z "$CONFIG_ARG"]; then' >> /usr/local/bin/mmdc && \
	echo '  echo "$DEFAULT_CONFIG" > /tmp/default_puppeteer_config.json' >> /usr/local/bin/mmdc && \
	echo '  CONFIG_ARG="-p /tmp/default_puppeteer_config.json"' >> /usr/local/bin/mmdc && \
	echo 'fi' >> /usr/local/bin/mmdc && \
	echo '/usr/local/bin/mmdc-original $CONFIG_ARG "$@"' >> /usr/local/bin/mmdc && \
	chmod +x /usr/local/bin/mmdc

# Make the new mmdc script executable
RUN chmod +x /usr/bin/mmdc

# --- pupeteer patch end

COPY ./  ./

ARG ASCIIDOCTOR_PARAMS
ENV ASCIIDOCTOR_PARAMS \
	-v \
	-a lang=hu \
	-r asciidoctor-diagram \
	-a toc-title=Tartalomjegyzék \
	-a figure-caption=ábra: \
	-a table-caption=táblázat: \
	-a toc=macro \
	-a toclevels=4 \
	-a sectnumlevels=4 \
	-a imagesdir=./resources/images \
	-r asciidoctor-pdf \
	-b pdf \
	-a media=prepress \
	-a source-highlighter=rouge

RUN asciidoctor README.adoc $ASCIIDOCTOR_PARAMS -o /documentation.pdf

FROM scratch AS pdf-export-stage

COPY --from=base ./documentation.pdf .