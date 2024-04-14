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
RUN mv /usr/local/bin/mmdc /usr/local/bin/mmdc-original

# Create a new mmdc script
RUN cat << 'EOF' > /usr/local/bin/mmdc \
	#!/usr/bin/env bash \
	# Default JSON configuration \
	DEFAULT_CONFIG='{"args":["--no-sandbox"]}' \
	\
	# Check if a config file is provided in the command-line arguments \
	for arg in "\$@"; do \
	if [[ "\$arg" == -p=* ]]; then \
	CONFIG_FILE=\${arg#-p=} \
	if [ -f "\$CONFIG_FILE" ]; then \
	# Load the existing JSON config and add "--no-sandbox" argument \
	jq '.args += ["--no-sandbox"]' "\$CONFIG_FILE" > /tmp/modified_puppeteer_config.json \
	CONFIG_ARG="-p /tmp/modified_puppeteer_config.json" \
	break \
	fi \
	fi \
	done \
	\
	# Use modified config file if it exists, otherwise use default config \
	if [ -z "\$CONFIG_ARG" ]; then \
	echo "\$DEFAULT_CONFIG" > /tmp/default_puppeteer_config.json \
	CONFIG_ARG="-p /tmp/default_puppeteer_config.json" \
	fi \
	\
	# Call the original mmdc with the new or modified JSON config \
	/usr/local/bin/mmdc-original \$CONFIG_ARG "\$@" \
	EOF

# Make the new mmdc script executable
RUN chmod +x /usr/local/bin/mmdc

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