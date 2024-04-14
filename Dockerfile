# build with this command:
# docker build . --file Dockerfile --progress plain -o build

FROM ruby:latest as base

RUN apt-get update
RUN apt-get install -y curl unzip
RUN apt-get install -y libgmp-dev default-jre

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

# RUN npm install -g vega-cli vega-lite

COPY ./  ./

ARG ASCIIDOCTOR_PARAMS
ENV ASCIIDOCTOR_PARAMS \
	-v \
	-a lang=hu \
	-r asciidoctor-diagram \
	-a mmdc=/usr/lib/node_modules/mermaid-cli/bin/mmdc \
	# -a vegalite=/usr/lib/node_modules/vega-lite/bin/vl2vg \
	# -a ditaa-shadows=false \
	# # -a ditaa-antialias=false \
	# -a ditaa-separation=false \
	# -a vegalite=/usr/lib/node_modules/vega-lite/bin/vl2vg \
	# -a vg2svg=/usr/lib/node_modules/vega-cli/bin/vg2svg \
	# -a allow-uri-read \
	# allow-uri-read is for kroki
	\
	-a toc-title=Tartalomjegyzék \
	-a figure-caption=ábra: \
	-a table-caption=táblázat: \
	# -r ./resources/scripts/remove_trailing_numbering.rb \
	# -r ./resources/scripts/AvoidBreakAfterSectionTitle.rb \
	-a toc=macro \
	-a toclevels=4 \
	-a sectnumlevels=4 \
	-a imagesdir=./resources/images \
	\
	# -r asciidoctor-bibtex \
	# -a bibtex-throw=true \
	# -a bibtex-file=./resources/refs.bib \
	# -a bibtex-locale=hu-HU \
	# -a bibtex-style=ieee \
	# -a bibtex-order=appearance \
	\
	-r asciidoctor-pdf \
	-b pdf \
	# -a pdf-theme=bme \
	# -a pdf-themesdir=./resources/themes \
	# -a pdf-fontsdir=./resources/fonts \
	-a media=prepress \
	-a source-highlighter=rouge
#-a rouge-style=monokai \

RUN asciidoctor README.adoc $ASCIIDOCTOR_PARAMS -o /documentation.pdf


FROM scratch AS szakdolgozat-pdf-export-stage

COPY --from=base ./documentation.pdf .