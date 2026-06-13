"""
mj_routes.py   -   MJ Content Studio
Routes:
    GET  /mj                        -> Studio HTML
    POST /mj/api/generate           -> Generate image posts (12 pillars)
    POST /mj/api/generate-banner    -> Generate banner concepts (12 pillars)
    POST /mj/api/generate-video     -> Generate video scripts (12 pillars)
    POST /mj/api/image              -> Gemini image generation
    POST /mj/api/schedule-buffer    -> Buffer scheduling
"""

import os, json, base64, requests, random
from flask import Blueprint, request, jsonify, Response

mj_bp = Blueprint('mj', __name__, url_prefix='/mj')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

# Story database system
# Stories persist in Railway volume at /data/mj_stories.json
# Falls back to embedded 484 stories if volume not available

import random as _random_mj, os as _os, json as _json

VOLUME_PATH = '/data'
STORIES_FILE = os.path.join(VOLUME_PATH, 'mj_stories.json')
USED_FILE = os.path.join(VOLUME_PATH, 'mj_used_stories.json')

# Embedded baseline stories (484 angles) - used when volume file doesn't exist
EMBEDDED_STORIES = [{"id": "humanitarian_000", "category": "humanitarian", "angle": "MJ's visit to Great Ormond Street Hospital for Children in London during the Bad Tour 1988, spending hours with young patients"}, {"id": "humanitarian_001", "category": "humanitarian", "angle": "MJ visiting the Bambino Gesu children's hospital in Rome during the Bad Tour, bringing gifts and spending time with sick children"}, {"id": "humanitarian_002", "category": "humanitarian", "angle": "MJ's personal visit to burned child David Rothenberg in 1984, a boy whose father set him on fire, and the ongoing support MJ provided"}, {"id": "humanitarian_003", "category": "humanitarian", "angle": "MJ visiting the children's ward at the Sophia Children's Hospital in Rotterdam during the Bad Tour 1988"}, {"id": "humanitarian_004", "category": "humanitarian", "angle": "MJ's visit to the Cedars-Sinai Medical Center children's ward in Los Angeles, documented by hospital staff"}, {"id": "humanitarian_005", "category": "humanitarian", "angle": "MJ bringing terminally ill children to Neverland Ranch through the Make-A-Wish Foundation throughout the 1990s"}, {"id": "humanitarian_006", "category": "humanitarian", "angle": "MJ's documented practice of inviting sick children backstage at his concerts across every major tour"}, {"id": "humanitarian_007", "category": "humanitarian", "angle": "MJ visiting St. Jude Children's Research Hospital and the impact of his donations on their research programs"}, {"id": "humanitarian_008", "category": "humanitarian", "angle": "MJ's personal phone calls to sick children in hospitals, documented by their families in multiple interviews"}, {"id": "humanitarian_009", "category": "humanitarian", "angle": "MJ visiting children at the Red Cross Children's Hospital in Cape Town during the HIStory Tour 1997"}, {"id": "humanitarian_010", "category": "humanitarian", "angle": "The founding of the Heal the World Foundation in 1992 and its first major program sending medicine to Sarajevo during the war"}, {"id": "humanitarian_011", "category": "humanitarian", "angle": "Heal the World Foundation airlifting 47,000 pounds of supplies to Sarajevo in 1992 during the Bosnian War"}, {"id": "humanitarian_012", "category": "humanitarian", "angle": "The Heal the World Foundation's work in Romania providing medical equipment to orphanages in 1993"}, {"id": "humanitarian_013", "category": "humanitarian", "angle": "Heal the World Foundation's vaccination programs reaching over 39 countries by 1995"}, {"id": "humanitarian_014", "category": "humanitarian", "angle": "MJ's personal contribution of $1.25 million to launch the Heal the World Foundation in 1992"}, {"id": "humanitarian_015", "category": "humanitarian", "angle": "The Heal the World Foundation's collaboration with UNICEF on childhood immunization drives in developing countries"}, {"id": "humanitarian_016", "category": "humanitarian", "angle": "MJ using his HIStory World Tour 1996-97 to raise funds for Heal the World Foundation programs in each host country"}, {"id": "humanitarian_017", "category": "humanitarian", "angle": "The recording of We Are the World on January 28 1985 after the American Music Awards, with 45 artists gathered at A&M Studios"}, {"id": "humanitarian_018", "category": "humanitarian", "angle": "Quincy Jones putting a sign on the door saying 'Check your egos at the door' before the We Are the World recording session"}, {"id": "humanitarian_019", "category": "humanitarian", "angle": "MJ and Lionel Richie writing We Are the World in six weeks, with MJ recording his demo parts on a cassette tape at home"}, {"id": "humanitarian_020", "category": "humanitarian", "angle": "We Are the World raising over $63 million for African famine relief and becoming the fastest-selling American pop single in history"}, {"id": "humanitarian_021", "category": "humanitarian", "angle": "MJ's specific vocal contributions to We Are the World and how he guided other artists on their parts during the session"}, {"id": "humanitarian_022", "category": "humanitarian", "angle": "The story behind the specific line MJ wrote for himself in We Are the World and why that lyric was chosen"}, {"id": "humanitarian_023", "category": "humanitarian", "angle": "MJ's $600,000 personal donation to the United Negro College Fund, announced at the 1988 Grammy Awards"}, {"id": "humanitarian_024", "category": "humanitarian", "angle": "MJ donating all proceeds from the Dangerous World Tour concerts to the Heal the World Foundation"}, {"id": "humanitarian_025", "category": "humanitarian", "angle": "MJ's donation of $1.5 million to a children's hospital in Mexico following the 1985 earthquake"}, {"id": "humanitarian_026", "category": "humanitarian", "angle": "MJ donating his entire advance from the Thriller album deal to charity, as documented in multiple business interviews"}, {"id": "humanitarian_027", "category": "humanitarian", "angle": "MJ funding the construction of a new children's wing at a hospital in South Korea after his 1996 tour stop"}, {"id": "humanitarian_028", "category": "humanitarian", "angle": "MJ's personal donation to rebuild homes after a fire destroyed a neighborhood near Neverland Ranch in the 1990s"}, {"id": "humanitarian_029", "category": "humanitarian", "angle": "MJ donating the proceeds from his 1988 short film Moonwalker to children's charities"}, {"id": "humanitarian_030", "category": "humanitarian", "angle": "MJ meeting President Nelson Mandela in South Africa in 1997 during the HIStory Tour and their documented conversation"}, {"id": "humanitarian_031", "category": "humanitarian", "angle": "MJ's meeting with President Bill Clinton at the White House and their discussion about youth programs"}, {"id": "humanitarian_032", "category": "humanitarian", "angle": "MJ performing at the Children's World Summit in 1993 and his speech about global responsibility to children"}, {"id": "humanitarian_033", "category": "humanitarian", "angle": "MJ's address to the Oxford Union in 2001, his speech about the need for parents to tell their children they love them"}, {"id": "humanitarian_034", "category": "humanitarian", "angle": "MJ receiving the United Nations Humanitarian Award in 1983 for his charitable contributions"}, {"id": "humanitarian_035", "category": "humanitarian", "angle": "MJ meeting Pope John Paul II at the Vatican in 1996 during the HIStory Tour"}, {"id": "humanitarian_036", "category": "humanitarian", "angle": "MJ's involvement in the Children's Defense Fund's fundraising efforts throughout the 1990s"}, {"id": "humanitarian_037", "category": "humanitarian", "angle": "MJ's friendship with Ryan White, the teenager with AIDS who was expelled from school, and how MJ publicly supported him"}, {"id": "humanitarian_038", "category": "humanitarian", "angle": "MJ's spoken word tribute to Ryan White after his death in 1990 and MJ performing at his funeral"}, {"id": "humanitarian_039", "category": "humanitarian", "angle": "MJ's donation to Ryan White's family after his death to help with medical bills and funeral costs"}, {"id": "humanitarian_040", "category": "humanitarian", "angle": "MJ performing at the United Negro College Fund benefit concert in 1983, raising significant funds for black higher education"}, {"id": "humanitarian_041", "category": "humanitarian", "angle": "MJ's work with Jesse Jackson on voter registration drives targeting young Black Americans in the 1980s"}, {"id": "humanitarian_042", "category": "humanitarian", "angle": "MJ's Earth Song and his documented work with environmental organizations to address climate and habitat destruction"}, {"id": "humanitarian_043", "category": "humanitarian", "angle": "MJ's narration for the documentary that accompanied Earth Song, addressing deforestation and animal extinction"}, {"id": "humanitarian_044", "category": "humanitarian", "angle": "MJ planting trees at Neverland Ranch with underprivileged children as part of environmental education programs"}, {"id": "humanitarian_045", "category": "humanitarian", "angle": "MJ visiting burn victims at the Brotman Medical Center in Culver City after his own Pepsi commercial accident in 1984"}, {"id": "humanitarian_046", "category": "humanitarian", "angle": "MJ donating his settlement money from the Pepsi accident to the Brotman Medical Center burn unit"}, {"id": "humanitarian_047", "category": "humanitarian", "angle": "MJ funding a full summer camp scholarship program for underprivileged children through the early 1990s"}, {"id": "humanitarian_048", "category": "humanitarian", "angle": "MJ's Secret Garden charity initiative that funded playground construction in low-income neighborhoods"}, {"id": "humanitarian_049", "category": "humanitarian", "angle": "MJ personally responding to fan letters from sick children and sending them signed memorabilia"}, {"id": "humanitarian_050", "category": "humanitarian", "angle": "MJ hosting free concerts for children from low-income families at Neverland Ranch throughout the 1990s"}, {"id": "humanitarian_051", "category": "humanitarian", "angle": "MJ's collaboration with the Elizabeth Taylor AIDS Foundation and their joint fundraising efforts"}, {"id": "humanitarian_052", "category": "humanitarian", "angle": "MJ performing at the 1992 Freddie Mercury tribute concert at Wembley, with proceeds going to AIDS research"}, {"id": "humanitarian_053", "category": "humanitarian", "angle": "MJ's donation to the HIV/AIDS research foundation after the death of his friend Ryan White"}, {"id": "humanitarian_054", "category": "humanitarian", "angle": "MJ's Dangerous Tour 1992-93 raising over $100 million globally with a portion directed to charity"}, {"id": "humanitarian_055", "category": "humanitarian", "angle": "MJ meeting with the children of Sarajevo via satellite during his Heal the World Foundation work in 1993"}, {"id": "humanitarian_056", "category": "humanitarian", "angle": "MJ's specific involvement in getting clean water to villages in Tanzania documented by Heal the World Foundation workers"}, {"id": "humanitarian_057", "category": "humanitarian", "angle": "MJ's contribution to rebuilding schools in a South African township documented during the HIStory Tour"}, {"id": "humanitarian_058", "category": "humanitarian", "angle": "MJ funding eye surgery for children in developing countries through the Heal the World Foundation's medical programs"}, {"id": "humanitarian_059", "category": "humanitarian", "angle": "MJ's documented habit of keeping a private list of sick children he was tracking and following up on personally"}, {"id": "humanitarian_060", "category": "humanitarian", "angle": "The story of MJ surprising a group of underprivileged children who had never seen the ocean by arranging a beach trip"}, {"id": "humanitarian_061", "category": "humanitarian", "angle": "MJ's personal phone call to the parents of a child who died of cancer after meeting him at a Dangerous Tour concert"}, {"id": "humanitarian_062", "category": "humanitarian", "angle": "MJ donating musical instruments to underprivileged schools across America through the early 1990s"}, {"id": "humanitarian_063", "category": "humanitarian", "angle": "MJ's work with the Special Olympics and his documented interactions with Special Olympics athletes"}, {"id": "humanitarian_064", "category": "humanitarian", "angle": "MJ's donation of the proceeds from his 1988 autobiography Moonwalk to children's literacy programs"}, {"id": "humanitarian_065", "category": "humanitarian", "angle": "MJ and Janet Jackson performing together at a benefit concert for AIDS research in 1993"}, {"id": "humanitarian_066", "category": "humanitarian", "angle": "MJ's funding of a youth music program in Chicago that trained underprivileged children in music production"}, {"id": "humanitarian_067", "category": "humanitarian", "angle": "The documented story of MJ anonymously paying for a child's cancer treatment discovered only after MJ's death"}, {"id": "humanitarian_068", "category": "humanitarian", "angle": "MJ's support of the Children's Defense Fund and his documented appearance at their annual gala"}, {"id": "humanitarian_069", "category": "humanitarian", "angle": "MJ's Heal the World Foundation building a playground for disabled children in London in 1993"}, {"id": "humanitarian_070", "category": "humanitarian", "angle": "MJ visiting children at St. Catherine's Hospital in Hamburg during the Bad World Tour 1987"}, {"id": "humanitarian_071", "category": "humanitarian", "angle": "MJ's personal reading program where he recorded audiobooks for children in hospitals to listen to"}, {"id": "humanitarian_072", "category": "humanitarian", "angle": "MJ donating custom recording equipment to a music therapy program for children with disabilities"}, {"id": "humanitarian_073", "category": "humanitarian", "angle": "MJ's handwritten notes of encouragement sent to sick children documented in hospital archives"}, {"id": "humanitarian_074", "category": "humanitarian", "angle": "MJ establishing an art therapy room in a children's hospital as a quiet space for creative healing"}, {"id": "humanitarian_075", "category": "humanitarian", "angle": "The documented account of MJ staying overnight at a hospital to comfort a child who was afraid of surgery"}, {"id": "personal_life_000", "category": "personal_life", "angle": "MJ's documented love of books and his personal library at Neverland Ranch containing over 10,000 volumes"}, {"id": "personal_life_001", "category": "personal_life", "angle": "MJ's favorite book being To Kill a Mockingbird and his documented admiration for Atticus Finch as a moral figure"}, {"id": "personal_life_002", "category": "personal_life", "angle": "MJ reading Peter Pan so often as an adult that his copy was falling apart, documented by his staff"}, {"id": "personal_life_003", "category": "personal_life", "angle": "MJ's interest in art history and his documented collection of original paintings and sculptures at Neverland"}, {"id": "personal_life_004", "category": "personal_life", "angle": "MJ's practice of waking up early to read the newspaper every morning, documented in multiple biographies"}, {"id": "personal_life_005", "category": "personal_life", "angle": "MJ's documented admiration for Charlie Chaplin and his study of Chaplin's physical comedy and music"}, {"id": "personal_life_006", "category": "personal_life", "angle": "MJ writing in journals almost daily, a habit documented by his longtime makeup artist Karen Faye"}, {"id": "personal_life_007", "category": "personal_life", "angle": "MJ's documented love of cartoons, particularly Tom and Jerry, which he watched daily according to his chef"}, {"id": "personal_life_008", "category": "personal_life", "angle": "MJ's favorite meal being southern fried chicken and waffles, a childhood preference he maintained into adulthood"}, {"id": "personal_life_009", "category": "personal_life", "angle": "MJ's documented love of vegetable soup made by his mother Katherine's recipe that he requested regularly"}, {"id": "personal_life_010", "category": "personal_life", "angle": "MJ's chef at Neverland documenting his preference for simple comfort foods over elaborate celebrity meals"}, {"id": "personal_life_011", "category": "personal_life", "angle": "MJ's documented habit of eating cereal late at night while watching old movies, according to his personal chef"}, {"id": "personal_life_012", "category": "personal_life", "angle": "MJ growing his own vegetables at Neverland Ranch and his documented interest in organic gardening"}, {"id": "personal_life_013", "category": "personal_life", "angle": "MJ renting out Disneyland for private nights with sick children from local hospitals throughout the 1990s"}, {"id": "personal_life_014", "category": "personal_life", "angle": "MJ's documented visits to Universal Studios after hours with friends where he would ride rides repeatedly"}, {"id": "personal_life_015", "category": "personal_life", "angle": "MJ renting out toy stores like FAO Schwarz after hours to shop privately, documented by security staff"}, {"id": "personal_life_016", "category": "personal_life", "angle": "MJ's Neverland Ranch ferris wheel and roller coaster that he would ride alone at night according to ranch staff"}, {"id": "personal_life_017", "category": "personal_life", "angle": "MJ's documented excitement about the rides at the Santa Cruz boardwalk where he would go in disguise"}, {"id": "personal_life_018", "category": "personal_life", "angle": "MJ's chimpanzee Bubbles and the documented story of how MJ acquired him from a research facility to give him a better life"}, {"id": "personal_life_019", "category": "personal_life", "angle": "MJ's documented love of his two giraffes at Neverland Ranch named Jabbar and Mohawk"}, {"id": "personal_life_020", "category": "personal_life", "angle": "MJ caring for an injured bird personally at Neverland and his documented concern for the animal's recovery"}, {"id": "personal_life_021", "category": "personal_life", "angle": "MJ's Neverland Zoo employing full-time veterinarians and his documented involvement in the animals' daily care"}, {"id": "personal_life_022", "category": "personal_life", "angle": "MJ's two Bengal tigers at Neverland and the documented care regimen he personally oversaw for them"}, {"id": "personal_life_023", "category": "personal_life", "angle": "MJ's documented Sunday phone calls to his mother Katherine throughout his adult career"}, {"id": "personal_life_024", "category": "personal_life", "angle": "MJ teaching his children to cook simple meals, documented by their longtime chef"}, {"id": "personal_life_025", "category": "personal_life", "angle": "MJ reading bedtime stories to his children every night when he was home, as documented by their nannies"}, {"id": "personal_life_026", "category": "personal_life", "angle": "MJ taking his children to a pumpkin patch in disguise for Halloween 2003, documented by local residents"}, {"id": "personal_life_027", "category": "personal_life", "angle": "MJ's documented tradition of celebrating his children's birthdays with elaborate private celebrations at Neverland"}, {"id": "personal_life_028", "category": "personal_life", "angle": "MJ teaching his son Michael Jr to dance in the kitchen when he was four years old, documented by household staff"}, {"id": "personal_life_029", "category": "personal_life", "angle": "MJ's relationship with his older siblings and the documented family dinners at their mother Katherine's home"}, {"id": "personal_life_030", "category": "personal_life", "angle": "MJ playing board games with his children, particularly Monopoly and Scrabble, documented by their tutors"}, {"id": "personal_life_031", "category": "personal_life", "angle": "MJ's documented habit of humming melodies constantly while going through his daily routine"}, {"id": "personal_life_032", "category": "personal_life", "angle": "MJ's practice of recording song ideas on a handheld recorder he kept with him at all times"}, {"id": "personal_life_033", "category": "personal_life", "angle": "MJ doing crossword puzzles every day, a habit documented by multiple members of his staff"}, {"id": "personal_life_034", "category": "personal_life", "angle": "MJ's documented preference for wearing clean white socks, going through multiple pairs per day"}, {"id": "personal_life_035", "category": "personal_life", "angle": "MJ's daily ritual of reviewing footage of his previous performances to critique and improve his dancing"}, {"id": "personal_life_036", "category": "personal_life", "angle": "MJ's documented meditation practice that he maintained daily, introduced to him by a spiritual advisor in the 1990s"}, {"id": "personal_life_037", "category": "personal_life", "angle": "MJ's friendship with comedian Richard Pryor and their documented conversations about comedy and performance"}, {"id": "personal_life_038", "category": "personal_life", "angle": "MJ's documented friendship with Steven Spielberg and their collaborative discussions about storytelling"}, {"id": "personal_life_039", "category": "personal_life", "angle": "MJ's friendship with Sophia Loren and the documented dinner parties they attended together in the 1980s"}, {"id": "personal_life_040", "category": "personal_life", "angle": "MJ's relationship with his longtime friend David Geffen and their documented business and personal conversations"}, {"id": "personal_life_041", "category": "personal_life", "angle": "MJ's friendship with Barry Gordy who founded Motown and their documented relationship beyond the business"}, {"id": "personal_life_042", "category": "personal_life", "angle": "MJ's documented love of antique shopping and his practice of visiting auction houses in disguise"}, {"id": "personal_life_043", "category": "personal_life", "angle": "MJ's art collection including works by Monet, Chagall and other masters documented in estate inventories"}, {"id": "personal_life_044", "category": "personal_life", "angle": "MJ collecting rare mechanical toys and music boxes, a hobby documented in multiple interviews"}, {"id": "personal_life_045", "category": "personal_life", "angle": "MJ's documented love of snow globes and his collection of hundreds of them at Neverland Ranch"}, {"id": "personal_life_046", "category": "personal_life", "angle": "MJ buying out an entire toy floor at FAO Schwarz in New York and donating everything to a children's hospital"}, {"id": "personal_life_047", "category": "personal_life", "angle": "MJ's documented practice of daily exercise including dance rehearsal even when not in production"}, {"id": "personal_life_048", "category": "personal_life", "angle": "MJ's vegetarian periods documented throughout his life and his interest in nutritional health"}, {"id": "personal_life_049", "category": "personal_life", "angle": "MJ's documented insomnia and his practice of watching classic films through the night when he couldn't sleep"}, {"id": "personal_life_050", "category": "personal_life", "angle": "MJ's love of swimming, with the Olympic-size pool at Neverland where he swam daily according to ranch staff"}, {"id": "personal_life_051", "category": "personal_life", "angle": "MJ's documented love of pajamas as casual wear around the house, a habit noted in multiple staff interviews"}, {"id": "personal_life_052", "category": "personal_life", "angle": "MJ wearing a surgical mask in public from the early 1990s onward and his documented reasoning for doing so"}, {"id": "personal_life_053", "category": "personal_life", "angle": "MJ's collection of military-style casual jackets he wore privately, distinct from his stage costumes"}, {"id": "personal_life_054", "category": "personal_life", "angle": "MJ's documented love of Levi's jeans and simple casual clothes when not performing or making public appearances"}, {"id": "personal_life_055", "category": "personal_life", "angle": "MJ's documented study of physics and space exploration, with NASA materials found in his private library"}, {"id": "personal_life_056", "category": "personal_life", "angle": "MJ's interest in architecture documented by his involvement in designing specific elements of Neverland Ranch"}, {"id": "personal_life_057", "category": "personal_life", "angle": "MJ's documented love of magic and his friendship with professional magicians who taught him illusions"}, {"id": "personal_life_058", "category": "personal_life", "angle": "MJ learning sleight of hand from a professional magician and practicing card tricks documented by his children"}, {"id": "personal_life_059", "category": "personal_life", "angle": "MJ's documented love of Paris and his frequent private visits to the city's museums and art galleries"}, {"id": "personal_life_060", "category": "personal_life", "angle": "MJ exploring the Louvre after hours in 1996 with a private guide, documented by French media"}, {"id": "personal_life_061", "category": "personal_life", "angle": "MJ visiting Japanese cultural sites in disguise during the HIStory Tour 1996 and his documented fascination with Japanese culture"}, {"id": "personal_life_062", "category": "personal_life", "angle": "MJ's documented preference for staying in private rented estates rather than hotels when touring internationally"}, {"id": "fashion_000", "category": "fashion", "angle": "The coordinated bell-bottom outfits the Jackson 5 wore on American Bandstand in 1969, designed by their mother Katherine"}, {"id": "fashion_001", "category": "fashion", "angle": "MJ's Afro hairstyle during the Jackson 5 era and the documented process of maintaining it for performances"}, {"id": "fashion_002", "category": "fashion", "angle": "The sequined vests and platform shoes MJ wore during the Jackson 5 Destiny Tour 1978 and their designer"}, {"id": "fashion_003", "category": "fashion", "angle": "MJ's adoption of the newsboy cap in the late 1970s as a signature casual look documented in fan photographs"}, {"id": "fashion_004", "category": "fashion", "angle": "The matching red outfits the Jackson 5 wore at Motown's Christmas special 1970, designed by the label"}, {"id": "fashion_005", "category": "fashion", "angle": "MJ's signature tuxedo look for Off The Wall in 1979, styled by Michael Bush who became his longtime costumer"}, {"id": "fashion_006", "category": "fashion", "angle": "The white dress shirt with bow tie that became MJ's Off The Wall era look and its documented inspiration from Fred Astaire"}, {"id": "fashion_007", "category": "fashion", "angle": "MJ's adoption of the high-water pants revealing white socks during the Off The Wall era and how it started as accident"}, {"id": "fashion_008", "category": "fashion", "angle": "The tan suit MJ wore to the American Music Awards in 1980 designed by Bill Whitten and its construction details"}, {"id": "fashion_009", "category": "fashion", "angle": "MJ's custom shoes for the Off The Wall era, the first time he worked with a custom cobbler for stage performance"}, {"id": "fashion_010", "category": "fashion", "angle": "The red leather jacket from the Thriller music video designed by John Landis's costume team not Michael Bush"}, {"id": "fashion_011", "category": "fashion", "angle": "MJ's yellow sweater vest and bow tie combination from the Billie Jean music video and its documented sourcing"}, {"id": "fashion_012", "category": "fashion", "angle": "The fedora MJ wore in various 1983 performances and its documented origins in his father Joe's personal wardrobe"}, {"id": "fashion_013", "category": "fashion", "angle": "MJ's costume for the Beat It music video designed to look like authentic LA gang attire of the era"}, {"id": "fashion_014", "category": "fashion", "angle": "The military-style jacket MJ wore at the Grammy Awards in 1984 that began his iconic military aesthetic"}, {"id": "fashion_015", "category": "fashion", "angle": "MJ's custom rhinestone glove designed by Bill Whitten in 1983 and why MJ started wearing only one glove"}, {"id": "fashion_016", "category": "fashion", "angle": "The gold jacket MJ wore to the White House meeting with President Reagan in 1984 and its specific design elements"}, {"id": "fashion_017", "category": "fashion", "angle": "MJ's look for the Victory Tour 1984, the first time Michael Bush fully designed his entire tour wardrobe"}, {"id": "fashion_018", "category": "fashion", "angle": "The black leather suit with zippers from the Bad music video designed by Michael Bush and Dennis Tompkins"}, {"id": "fashion_019", "category": "fashion", "angle": "MJ's custom-made boots with buckles for the Bad Tour designed to accommodate his signature moonwalk technique"}, {"id": "fashion_020", "category": "fashion", "angle": "The white shirt and black armband MJ wore at the 1987 American Music Awards and its documented meaning to him"}, {"id": "fashion_021", "category": "fashion", "angle": "MJ's custom Bad Tour stage costumes and the documented process of creating hundreds of copies for the 18-month tour"}, {"id": "fashion_022", "category": "fashion", "angle": "The tan suit MJ wore for the Smooth Criminal music video and the anti-gravity lean mechanism built into the shoes"}, {"id": "fashion_023", "category": "fashion", "angle": "MJ's sunglasses collection during the Bad era and the specific designers he favored for his signature look"}, {"id": "fashion_024", "category": "fashion", "angle": "MJ's armored jacket for the Dangerous album cover and the documented concept behind the imagery"}, {"id": "fashion_025", "category": "fashion", "angle": "The gold crown and cape MJ wore for the Remember the Time music video and their Egyptian historical inspirations"}, {"id": "fashion_026", "category": "fashion", "angle": "MJ's casual street style documented during the Dangerous era including custom Versace pieces worn privately"}, {"id": "fashion_027", "category": "fashion", "angle": "The military-inspired jacket MJ wore for the Dangerous World Tour 1992 opening ceremony in Munich"}, {"id": "fashion_028", "category": "fashion", "angle": "MJ's custom boots for the Dangerous Tour featuring a hidden mechanism that made the moonwalk slide smoother"}, {"id": "fashion_029", "category": "fashion", "angle": "The military commander uniform MJ wore for the HIStory Tour announcement in New York City in 1995"}, {"id": "fashion_030", "category": "fashion", "angle": "MJ's HBO concert special outfit from 1992 Royal Rumble and its documented relationship to his King of Pop persona"}, {"id": "fashion_031", "category": "fashion", "angle": "The white suit MJ wore at the 1996 BRITs when Jarvis Cocker protested on stage and MJ's documented response"}, {"id": "fashion_032", "category": "fashion", "angle": "MJ's custom HIStory Tour stage costumes requiring 47 individual pieces per outfit documented by Michael Bush"}, {"id": "fashion_033", "category": "fashion", "angle": "The gold armored costume MJ wore for Earth Song at the 1996 BRIT Awards and its theological symbolism"}, {"id": "fashion_034", "category": "fashion", "angle": "MJ's casual fashion choices in the early 2000s documented in paparazzi photos showing his personal style evolution"}, {"id": "fashion_035", "category": "fashion", "angle": "MJ wearing custom Prada and Louis Vuitton during his private shopping trips in the early 2000s"}, {"id": "fashion_036", "category": "fashion", "angle": "MJ's documented love of custom-made shirts from a specific Beverly Hills tailor he visited throughout the 2000s"}, {"id": "fashion_037", "category": "fashion", "angle": "The red military jacket MJ wore at the 2001 30th Anniversary concert at Madison Square Garden"}, {"id": "fashion_038", "category": "fashion", "angle": "The rehearsal outfits MJ wore during This Is It 2009 contrasting with his stage costumes in rehearsal footage"}, {"id": "fashion_039", "category": "fashion", "angle": "MJ's classic blue military jacket worn in This Is It rehearsals and its connection to his Off The Wall aesthetic"}, {"id": "fashion_040", "category": "fashion", "angle": "The custom stage costumes being prepared for This Is It that were never performed in, documented in the concert film"}, {"id": "fashion_041", "category": "fashion", "angle": "MJ's documented love of simple white V-neck t-shirts and jeans for casual private moments at home"}, {"id": "fashion_042", "category": "fashion", "angle": "MJ wearing a blue and white track suit during his neighborhood walks near Neverland documented by locals"}, {"id": "fashion_043", "category": "fashion", "angle": "MJ's collection of vintage band t-shirts including The Beatles and The Rolling Stones documented by his children"}, {"id": "fashion_044", "category": "fashion", "angle": "MJ's documented preference for slip-on shoes in casual settings and his collection of custom loafers"}, {"id": "fashion_045", "category": "fashion", "angle": "MJ wearing a classic navy peacoat during a private visit to a bookstore in Paris documented by bookstore staff"}, {"id": "fashion_046", "category": "fashion", "angle": "MJ's documented friendship with Gianni Versace and the custom pieces Versace created for MJ personally"}, {"id": "fashion_047", "category": "fashion", "angle": "MJ commissioning Claude Montana for specific pieces in the HIStory era and their documented design collaboration"}, {"id": "fashion_048", "category": "fashion", "angle": "MJ's relationship with Donna Karan and the casual pieces she designed specifically for his private wardrobe"}, {"id": "fashion_049", "category": "fashion", "angle": "The documented story of MJ ordering custom suits from a tailor in London's Savile Row for private use"}, {"id": "fashion_050", "category": "fashion", "angle": "MJ working with shoe designer Ferragamo on custom stage shoes beginning in the Bad era"}, {"id": "music_creation_000", "category": "music_creation", "angle": "Rod Temperton writing Don't Stop Til You Get Enough for MJ and their first creative meeting in 1978"}, {"id": "music_creation_001", "category": "music_creation", "angle": "Rod Temperton writing Rock With You for Off The Wall and his documented process of writing songs specifically for MJ's voice"}, {"id": "music_creation_002", "category": "music_creation", "angle": "The recording of Off The Wall at Allen Zentz Recording in Hollywood and Bruce Swedien's documented engineering innovations"}, {"id": "music_creation_003", "category": "music_creation", "angle": "MJ recording his vocals for Off The Wall in one or two takes, documented by engineer Bruce Swedien as unusual for the era"}, {"id": "music_creation_004", "category": "music_creation", "angle": "The story of MJ and Quincy Jones meeting at a party hosted by Diana Ross in 1975 that led to their collaboration"}, {"id": "music_creation_005", "category": "music_creation", "angle": "MJ's contribution to writing the lyrics of Get On The Floor for Off The Wall documented in studio session notes"}, {"id": "music_creation_006", "category": "music_creation", "angle": "Rod Temperton writing the title track Thriller overnight after MJ rejected his first draft called Starlight"}, {"id": "music_creation_007", "category": "music_creation", "angle": "Vincent Price recording his rap for Thriller in one take on October 30 1982 at Westlake Recording Studios"}, {"id": "music_creation_008", "category": "music_creation", "angle": "Eddie Van Halen recording his guitar solo for Beat It for free as a personal favor, spending three hours perfecting it"}, {"id": "music_creation_009", "category": "music_creation", "angle": "The recording of Billie Jean with Quincy Jones initially not wanting to include it on the album"}, {"id": "music_creation_010", "category": "music_creation", "angle": "Bruce Swedien's documented discovery of the specific drum sound on Billie Jean using multiple room mics"}, {"id": "music_creation_011", "category": "music_creation", "angle": "MJ recording Human Nature which was written by Steve Porcaro of Toto and given to MJ through Quincy Jones"}, {"id": "music_creation_012", "category": "music_creation", "angle": "The documented story of Quincy Jones nearly cutting P.Y.T. from the Thriller album and why MJ insisted it stay"}, {"id": "music_creation_013", "category": "music_creation", "angle": "MJ's documented home demo recordings for Thriller that he made on a cassette recorder to develop ideas"}, {"id": "music_creation_014", "category": "music_creation", "angle": "The original Thriller album taking over 11 months to record at multiple Los Angeles studios documented by engineers"}, {"id": "music_creation_015", "category": "music_creation", "angle": "Greg Phillinganes playing the keyboard intro to Thriller that became one of the most recognized riffs in pop history"}, {"id": "music_creation_016", "category": "music_creation", "angle": "MJ writing the lyrics to Man in the Mirror while sitting at his piano at Neverland in 1986"}, {"id": "music_creation_017", "category": "music_creation", "angle": "Siedah Garrett and Glen Ballard writing Man in the Mirror in 90 minutes and presenting it to MJ"}, {"id": "music_creation_018", "category": "music_creation", "angle": "MJ's writing of Bad and his documented inspiration from real fights he witnessed between gang members in New York"}, {"id": "music_creation_019", "category": "music_creation", "angle": "The recording of I Just Can't Stop Loving You as a duet originally intended for Whitney Houston who declined"}, {"id": "music_creation_020", "category": "music_creation", "angle": "Siedah Garrett recording the duet I Just Can't Stop Loving You with MJ after Whitney Houston passed"}, {"id": "music_creation_021", "category": "music_creation", "angle": "MJ spending 40 hours recording vocals for just one track on the Bad album documented by Bruce Swedien"}, {"id": "music_creation_022", "category": "music_creation", "angle": "The recording of Smooth Criminal and the anti-gravity lean effect originally achieved by a bolt in the shoe during filming"}, {"id": "music_creation_023", "category": "music_creation", "angle": "MJ writing Dirty Diana about a specific groupie type he encountered on tour, documented in his autobiography"}, {"id": "music_creation_024", "category": "music_creation", "angle": "Bill Bottrell co-writing Speed Demon for the Bad album and his entry into MJ's creative circle"}, {"id": "music_creation_025", "category": "music_creation", "angle": "Teddy Riley creating the New Jack Swing sound specifically to update MJ's style for the Dangerous album in 1991"}, {"id": "music_creation_026", "category": "music_creation", "angle": "MJ and Teddy Riley's recorded sessions at Record One Studios in Sherman Oaks producing seven tracks together"}, {"id": "music_creation_027", "category": "music_creation", "angle": "Bill Bottrell co-producing Black or White and the documented creative tension over the song's final sound"}, {"id": "music_creation_028", "category": "music_creation", "angle": "Slash recording the guitar for Black or White and his documented reaction to working with MJ in the studio"}, {"id": "music_creation_029", "category": "music_creation", "angle": "Bryan Loren originally working on the Dangerous album and the documented reasons most of his tracks were cut"}, {"id": "music_creation_030", "category": "music_creation", "angle": "MJ writing Will You Be There while living at Neverland and its documented connection to his feelings of isolation"}, {"id": "music_creation_031", "category": "music_creation", "angle": "The recording of Heal the World and MJ's documented emotional state during vocal sessions for the song"}, {"id": "music_creation_032", "category": "music_creation", "angle": "David Foster initially producing some tracks for Dangerous before being replaced and the documented reasons why"}, {"id": "music_creation_033", "category": "music_creation", "angle": "MJ sampling Aaron Neville's performance during the recording of Give In To Me, documented by the engineer"}, {"id": "music_creation_034", "category": "music_creation", "angle": "The spoken word poem MJ recorded for Gone Too Soon dedicated to Ryan White and its recording session details"}, {"id": "music_creation_035", "category": "music_creation", "angle": "MJ writing Stranger in Moscow in a hotel room in Moscow during the Dangerous Tour 1993 at 4am"}, {"id": "music_creation_036", "category": "music_creation", "angle": "Jimmy Jam and Terry Lewis producing half of the HIStory album and their documented creative process with MJ"}, {"id": "music_creation_037", "category": "music_creation", "angle": "MJ writing Earth Song over several years starting in 1988 and the documented evolution of the song's message"}, {"id": "music_creation_038", "category": "music_creation", "angle": "The recording of You Are Not Alone written by R. Kelly and MJ's documented first reaction to hearing the demo"}, {"id": "music_creation_039", "category": "music_creation", "angle": "MJ's You Are Not Alone becoming the first song to debut at number one on the Billboard Hot 100 in 1995"}, {"id": "music_creation_040", "category": "music_creation", "angle": "MJ recording They Don't Care About Us in Brazil with director Spike Lee and the documented local community response"}, {"id": "music_creation_041", "category": "music_creation", "angle": "MJ writing Blood on the Dance Floor as a commentary on a specific incident documented in his personal journals"}, {"id": "music_creation_042", "category": "music_creation", "angle": "The recorded vocal session for Earth Song where MJ reportedly wept during one take, documented by the engineer"}, {"id": "music_creation_043", "category": "music_creation", "angle": "Rodney Jerkins producing tracks for Invincible and his documented descriptions of MJ's studio work habits"}, {"id": "music_creation_044", "category": "music_creation", "angle": "MJ spending four years recording Invincible from 1997 to 2001 at multiple studios across five countries"}, {"id": "music_creation_045", "category": "music_creation", "angle": "Carlos Santana recording guitar for a track on Invincible that was ultimately cut from the final album"}, {"id": "music_creation_046", "category": "music_creation", "angle": "MJ recording 170 songs for Invincible with only 16 appearing on the final album documented by Sony executives"}, {"id": "music_creation_047", "category": "music_creation", "angle": "The documented production budget for Invincible exceeding $30 million making it one of the most expensive albums ever"}, {"id": "music_creation_048", "category": "music_creation", "angle": "MJ's collaborations with producers Dr. Freeze and Nile Rodgers on tracks that were cut from Invincible"}, {"id": "music_creation_049", "category": "music_creation", "angle": "MJ's documented practice of beatboxing melody ideas into a recorder and sending them to producers as song seeds"}, {"id": "music_creation_050", "category": "music_creation", "angle": "MJ's documented technique of writing lyrics in the moment during vocal recording rather than preparing them in advance"}, {"id": "music_creation_051", "category": "music_creation", "angle": "The documented story of MJ recording scratch vocals and then trying to match them exactly in formal sessions"}, {"id": "music_creation_052", "category": "music_creation", "angle": "Bruce Swedien's documentation of MJ's ability to hear the most subtle sonic imperfections in a mix"}, {"id": "music_creation_053", "category": "music_creation", "angle": "MJ's documented collaboration with Paul McCartney on Say Say Say and The Girl Is Mine and their creative dynamic"}, {"id": "music_creation_054", "category": "music_creation", "angle": "Paul McCartney and MJ writing The Girl Is Mine in an afternoon session at MJ's home in 1982"}, {"id": "music_creation_055", "category": "music_creation", "angle": "MJ's documented purchase of the Beatles catalog ATV Music Publishing in 1985 for $47.5 million"}, {"id": "music_creation_056", "category": "music_creation", "angle": "MJ writing Got To Be There, his first solo hit at age 12, and the documented story of how Berry Gordy chose it"}, {"id": "rare_moments_000", "category": "rare_moments", "angle": "MJ stopping his motorcade in Harlem to give $100 bills to homeless people documented by security and passersby"}, {"id": "rare_moments_001", "category": "rare_moments", "angle": "MJ disguising himself as a street musician in New York in the 1980s to see if people would recognize him"}, {"id": "rare_moments_002", "category": "rare_moments", "angle": "MJ's documented practice of leaving generous anonymous tips for hotel staff and restaurant workers"}, {"id": "rare_moments_003", "category": "rare_moments", "angle": "MJ stopping a concert in Romania when he noticed a child fainting in the crowd and waiting for medical attention"}, {"id": "rare_moments_004", "category": "rare_moments", "angle": "MJ calling the family of a fan who had traveled from Africa to see his concert and could not afford tickets"}, {"id": "rare_moments_005", "category": "rare_moments", "angle": "MJ's documented habit of walking the grounds of Neverland at 3am and feeding the animals alone"}, {"id": "rare_moments_006", "category": "rare_moments", "angle": "MJ personally writing back to a fan letter from a terminally ill child documented by the child's family"}, {"id": "rare_moments_007", "category": "rare_moments", "angle": "MJ visiting the childhood home where he grew up in Gary Indiana in 1993 and his documented emotional reaction"}, {"id": "rare_moments_008", "category": "rare_moments", "angle": "MJ stopping a recording session to comfort a studio engineer who was going through a personal crisis"}, {"id": "rare_moments_009", "category": "rare_moments", "angle": "MJ's documented practice of meditating in complete silence for an hour before every major performance"}, {"id": "rare_moments_010", "category": "rare_moments", "angle": "MJ learning a few phrases in the local language of every country he toured in, documented by his translator"}, {"id": "rare_moments_011", "category": "rare_moments", "angle": "MJ spending his one free afternoon during a European tour visiting an art museum alone with a single bodyguard"}, {"id": "rare_moments_012", "category": "rare_moments", "angle": "MJ's reaction upon first hearing Thriller's final mix, documented by Quincy Jones as unusual emotional restraint"}, {"id": "rare_moments_013", "category": "rare_moments", "angle": "MJ giving his Grammy Award from 1984 to a young fan backstage who mentioned it was their birthday"}, {"id": "rare_moments_014", "category": "rare_moments", "angle": "MJ personally handwriting over 100 letters to contest winners who won prizes at his concerts"}, {"id": "rare_moments_015", "category": "rare_moments", "angle": "MJ's documented reaction when he first saw the audience for a sold-out Wembley Stadium show from the wings"}, {"id": "rare_moments_016", "category": "rare_moments", "angle": "MJ stopping mid-rehearsal to compliment a background dancer who he noticed was particularly skilled"}, {"id": "rare_moments_017", "category": "rare_moments", "angle": "The documented story of MJ learning Swahili phrases to greet children during his visits to African hospitals"}, {"id": "rare_moments_018", "category": "rare_moments", "angle": "MJ's personal assistant documenting MJ's habit of humming the opening notes of Somewhere Over the Rainbow each morning"}, {"id": "rare_moments_019", "category": "rare_moments", "angle": "MJ taking an impromptu drawing class from a young art student he met at a party in Los Angeles in 1989"}, {"id": "rare_moments_020", "category": "rare_moments", "angle": "MJ's documented visit to the Louvre where he spent four hours studying Rembrandt's technique specifically"}, {"id": "rare_moments_021", "category": "rare_moments", "angle": "MJ inviting the entire crew of a music video he directed to a private screening and serving them home-cooked food"}, {"id": "rare_moments_022", "category": "rare_moments", "angle": "MJ's documented habit of reviewing his own performances with the volume off to focus purely on his physicality"}, {"id": "rare_moments_023", "category": "rare_moments", "angle": "MJ spending three hours with a young dancer backstage after noticing her in the audience doing his moves"}, {"id": "rare_moments_024", "category": "rare_moments", "angle": "The documented story of MJ paying for a fan's college education after learning she was struggling financially"}, {"id": "rare_moments_025", "category": "rare_moments", "angle": "MJ's reaction documented by his makeup artist when he first saw himself in full costume for the Thriller video"}, {"id": "rare_moments_026", "category": "rare_moments", "angle": "MJ stopping his car on Sunset Boulevard to help push a stranger's broken-down vehicle, documented by a bystander"}, {"id": "rare_moments_027", "category": "rare_moments", "angle": "MJ's documented visit to a senior citizens home in New Jersey where he performed for residents in a common room"}, {"id": "rare_moments_028", "category": "rare_moments", "angle": "The story of MJ personally calling a radio station that was playing his music to thank the DJ"}, {"id": "rare_moments_029", "category": "rare_moments", "angle": "MJ's documented habit of reviewing concert footage frame by frame to analyze his own footwork"}, {"id": "rare_moments_030", "category": "rare_moments", "angle": "MJ's surprise unannounced visit to a children's choir rehearsal in London documented by their choirmaster"}, {"id": "rare_moments_031", "category": "rare_moments", "angle": "MJ sitting alone in the rain at Neverland after a concert tour ended, documented by his head of security"}, {"id": "rare_moments_032", "category": "rare_moments", "angle": "MJ's reaction documented by his assistant when he received a drawing made by a hospitalized child he had visited"}, {"id": "rare_moments_033", "category": "rare_moments", "angle": "MJ attending a high school theatrical production incognito and leaving encouraging notes for the lead performers"}, {"id": "rare_moments_034", "category": "rare_moments", "angle": "The documented story of MJ refusing to leave a hospital until he had visited every child on the ward"}, {"id": "rare_moments_035", "category": "rare_moments", "angle": "MJ's personal collection of letters from fans that he kept organized in binders at Neverland Ranch"}, {"id": "rare_moments_036", "category": "rare_moments", "angle": "MJ teaching his backup dancers specific moves from old Fred Astaire films during Bad Tour rehearsals"}, {"id": "rare_moments_037", "category": "rare_moments", "angle": "MJ's documented reaction when a young child recognized him through his disguise in a department store"}, {"id": "rare_moments_038", "category": "rare_moments", "angle": "MJ spending his day off during a Tokyo tour stop visiting a school for children with disabilities"}, {"id": "rare_moments_039", "category": "rare_moments", "angle": "MJ's documented practice of keeping photographs of children he visited in hospitals in his tour bus"}, {"id": "rare_moments_040", "category": "rare_moments", "angle": "The story of MJ staying in contact with a family he met by chance at an airport for over a decade"}, {"id": "rare_moments_041", "category": "rare_moments", "angle": "MJ's documented late-night phone calls to old friends from his Motown days just to check in"}, {"id": "rare_moments_042", "category": "rare_moments", "angle": "MJ's reaction when a stagehand told him it was their last day of work before retirement, documented by crew members"}, {"id": "rare_moments_043", "category": "rare_moments", "angle": "MJ visiting the set of Home Alone to meet Macaulay Culkin during filming and their documented first meeting"}, {"id": "rare_moments_044", "category": "rare_moments", "angle": "MJ's assistant documenting MJ finding and adopting a stray cat that wandered onto the Neverland property"}, {"id": "rare_moments_045", "category": "rare_moments", "angle": "MJ personally reviewing and editing the press package for the Dangerous album release, noting specific word choices"}, {"id": "rare_moments_046", "category": "rare_moments", "angle": "MJ's documented excitement about seeing a lunar eclipse from the Neverland grounds, staying up all night to watch"}, {"id": "rare_moments_047", "category": "rare_moments", "angle": "MJ's private reading of bedtime stories over the phone to the child of a hospitalized friend"}, {"id": "rare_moments_048", "category": "rare_moments", "angle": "The documented account of MJ sending flowers anonymously to a grieving family whose story he read in a newspaper"}, {"id": "rare_moments_049", "category": "rare_moments", "angle": "MJ's habit of leaving the studio to stand outside and look at the stars when he was searching for creative inspiration"}, {"id": "rare_moments_050", "category": "rare_moments", "angle": "MJ asking Bruce Swedien to let him hear the isolated drum track of Beat It just to appreciate it on its own"}, {"id": "rare_moments_051", "category": "rare_moments", "angle": "MJ's documented practice of writing letters to himself to stay motivated during difficult periods of his career"}, {"id": "rare_moments_052", "category": "rare_moments", "angle": "MJ visiting a nursing home in New York in 1985 and performing an impromptu acoustic number for the residents"}, {"id": "rare_moments_053", "category": "rare_moments", "angle": "MJ's documented collection of vintage photographs of Chaplin, Astaire and other performers he studied"}, {"id": "rare_moments_054", "category": "rare_moments", "angle": "MJ spending his last free day before the Dangerous Tour began alone in a park in Munich watching people"}, {"id": "rare_moments_055", "category": "rare_moments", "angle": "The documented story of MJ tipping a restaurant staff member enough to pay for their child's operation"}, {"id": "rare_moments_056", "category": "rare_moments", "angle": "MJ learning to cook a traditional Japanese meal from a chef he met during the Bad Tour 1987 Tokyo stop"}, {"id": "achievements_000", "category": "achievements", "angle": "Thriller becoming the best-selling album of all time with over 66 million copies sold globally"}, {"id": "achievements_001", "category": "achievements", "angle": "MJ winning eight Grammy Awards in one night on February 28 1984 breaking the record for most Grammies in a single night"}, {"id": "achievements_002", "category": "achievements", "angle": "Billie Jean spending seven consecutive weeks at number one on the Billboard Hot 100 in 1983"}, {"id": "achievements_003", "category": "achievements", "angle": "Thriller spending 37 weeks at number one on the Billboard 200 album chart from 1983 to 1984"}, {"id": "achievements_004", "category": "achievements", "angle": "MJ becoming the first artist to have seven singles from one album reach the top 10 of the Billboard Hot 100"}, {"id": "achievements_005", "category": "achievements", "angle": "The Thriller music video being inducted into the Library of Congress National Film Registry in 2009"}, {"id": "achievements_006", "category": "achievements", "angle": "MJ's Off The Wall in 1979 becoming the first solo album to produce four top 10 singles in the US"}, {"id": "achievements_007", "category": "achievements", "angle": "MJ being inducted into the Rock and Roll Hall of Fame in 2001 with the first eligible year of induction"}, {"id": "achievements_008", "category": "achievements", "angle": "Bad becoming the first album to produce five number one singles in the United States in 1988"}, {"id": "achievements_009", "category": "achievements", "angle": "MJ's Dangerous album entering the Billboard 200 at number one in 1991 selling 6 million copies in its first week"}, {"id": "achievements_010", "category": "achievements", "angle": "MJ receiving the Guinness World Record for most successful entertainer of all time in 2006"}, {"id": "achievements_011", "category": "achievements", "angle": "MJ's This Is It concert series selling 750,000 tickets in five hours upon release in 2009"}, {"id": "achievements_012", "category": "achievements", "angle": "You Are Not Alone becoming the first song to debut at number one on the Billboard Hot 100 in 1995"}, {"id": "achievements_013", "category": "achievements", "angle": "MJ receiving 13 American Music Awards in a single night in 1984 breaking the previous record"}, {"id": "achievements_014", "category": "achievements", "angle": "MJ's Thriller winning Album of the Year at the Grammy Awards in 1984 over multiple strong nominees"}, {"id": "achievements_015", "category": "achievements", "angle": "MJ selling out 10 consecutive nights at Wembley Stadium during the Bad Tour 1988 breaking the record"}, {"id": "achievements_016", "category": "achievements", "angle": "The Bad Tour grossing $125 million making it the highest-grossing concert tour in history at the time"}, {"id": "achievements_017", "category": "achievements", "angle": "MJ's Dangerous Tour 1992-93 becoming the first concert tour to reach over 3.5 million people in Eastern Europe"}, {"id": "achievements_018", "category": "achievements", "angle": "HIStory selling 20 million copies in the first week of release in 1995 setting a record for first-week sales"}, {"id": "achievements_019", "category": "achievements", "angle": "MJ's Pepsi endorsement deal in 1984 worth $5 million becoming the largest celebrity endorsement deal ever at the time"}, {"id": "achievements_020", "category": "achievements", "angle": "MJ receiving the President's Award at the NAACP Image Awards in 1984 for his humanitarian work"}, {"id": "achievements_021", "category": "achievements", "angle": "MJ's clothing worn in the Beat It video being displayed at the Rock and Roll Hall of Fame Museum"}, {"id": "achievements_022", "category": "achievements", "angle": "MJ's white glove worn during his first Motown 25 appearance selling at auction for $190,000 in 2009"}, {"id": "achievements_023", "category": "achievements", "angle": "The Thriller album spending 80 total weeks on the Billboard 200 chart over multiple chart runs"}, {"id": "achievements_024", "category": "achievements", "angle": "MJ winning a Billboard Century Award in 1996 recognizing distinguished creative achievement"}, {"id": "achievements_025", "category": "achievements", "angle": "MJ's music video for Black or White becoming the most-watched music video in television history at the time of release"}, {"id": "achievements_026", "category": "achievements", "angle": "MJ receiving the Humanitarian Award from the United Nations in 1983"}, {"id": "achievements_027", "category": "achievements", "angle": "MJ achieving Diamond certification for Thriller in the United States recognizing 10 million copies sold domestically"}, {"id": "achievements_028", "category": "achievements", "angle": "MJ's estate earning over $1 billion in the five years following his death according to Forbes magazine"}, {"id": "achievements_029", "category": "achievements", "angle": "MJ's Off The Wall becoming the first album by a Black artist to achieve five million sales in the United States"}, {"id": "achievements_030", "category": "achievements", "angle": "MJ receiving honorary doctorates from multiple universities including the United Negro College Fund institutions"}, {"id": "achievements_031", "category": "achievements", "angle": "MJ's Dangerous album being certified 7x Platinum in the United States"}, {"id": "achievements_032", "category": "achievements", "angle": "MJ winning 26 American Music Awards total during his career more than any other artist"}, {"id": "achievements_033", "category": "achievements", "angle": "MJ's HIStory Tour 1996-97 selling 4.5 million tickets making it the second-highest-grossing tour in history at the time"}, {"id": "achievements_034", "category": "achievements", "angle": "MJ receiving the MTV Video Vanguard Award in 1988 renamed the Michael Jackson Video Vanguard Award after his death"}, {"id": "achievements_035", "category": "achievements", "angle": "MJ's song Earth Song reaching number one in the United Kingdom for six consecutive weeks in 1995"}, {"id": "achievements_036", "category": "achievements", "angle": "MJ being the first Black artist to appear on the cover of Tiger Beat magazine in 1972"}, {"id": "achievements_037", "category": "achievements", "angle": "MJ's first solo number one single Got To Be There reaching number four on the Billboard Hot 100 when he was 13"}, {"id": "achievements_038", "category": "achievements", "angle": "MJ's ABC reaching number eight on the Billboard Hot 100 when MJ was 12 years old"}, {"id": "achievements_039", "category": "achievements", "angle": "The Jackson 5 having their first four singles reach number one consecutively in 1969 and 1970"}, {"id": "achievements_040", "category": "achievements", "angle": "MJ receiving a star on the Hollywood Walk of Fame as a solo artist in 1984"}, {"id": "achievements_041", "category": "achievements", "angle": "MJ's Will You Be There from the Free Willy soundtrack reaching number nine on the Billboard Hot 100 in 1993"}, {"id": "achievements_042", "category": "achievements", "angle": "MJ's sales of over 400 million records worldwide documented by multiple industry tracking organizations"}, {"id": "achievements_043", "category": "achievements", "angle": "MJ winning the Grammy Legend Award in 1993 presented to him by actress Janet Jackson"}, {"id": "achievements_044", "category": "achievements", "angle": "MJ receiving the BET Lifetime Achievement Award in 2003"}, {"id": "achievements_045", "category": "achievements", "angle": "MJ's Thriller certified as the best-selling album of the 20th century by the Recording Industry Association of America"}, {"id": "achievements_046", "category": "achievements", "angle": "MJ's estate generating more than any living musician in 2016 according to Forbes annual earnings survey"}, {"id": "achievements_047", "category": "achievements", "angle": "MJ's Give In To Me reaching number two in the United Kingdom in 1993"}, {"id": "achievements_048", "category": "achievements", "angle": "The Jackson 5 being inducted into the Rock and Roll Hall of Fame in 1997"}, {"id": "achievements_049", "category": "achievements", "angle": "MJ winning 15 Grammy Awards total during his career with eight coming in the single night of 1984"}, {"id": "performances_000", "category": "performances", "angle": "MJ's debut of the moonwalk on Motown 25: Yesterday, Today and Forever on May 16 1983 performing Billie Jean"}, {"id": "performances_001", "category": "performances", "angle": "MJ's Super Bowl XXVII halftime performance on January 31 1993 opening with 90 seconds of complete stillness"}, {"id": "performances_002", "category": "performances", "angle": "MJ's first televised solo performance on American Bandstand in 1977 performing Rock With You"}, {"id": "performances_003", "category": "performances", "angle": "MJ performing Billie Jean for the first time on television at the Motown 25 special and the documented preparation"}, {"id": "performances_004", "category": "performances", "angle": "MJ's performance at the 1984 Grammy Awards performing Beat It with Eddie Van Halen joining on guitar"}, {"id": "performances_005", "category": "performances", "angle": "MJ's private performance for a group of orphaned children in Budapest during the Dangerous Tour 1992"}, {"id": "performances_006", "category": "performances", "angle": "MJ's surprise appearance at the 1993 Soul Train Music Awards presenting the heritage award"}, {"id": "performances_007", "category": "performances", "angle": "MJ performing at the opening of Disneyland's Captain EO film attraction in 1986 for invited guests"}, {"id": "performances_008", "category": "performances", "angle": "MJ's intimate performance for Queen Elizabeth II at the Royal Variety Performance in 1983"}, {"id": "performances_009", "category": "performances", "angle": "MJ performing Man in the Mirror at the Grammy Awards in 1988 which many critics called one of his greatest live moments"}, {"id": "performances_010", "category": "performances", "angle": "MJ's performance at the American Music Awards in 1993 just days before announcing his Dangerous Tour hiatus"}, {"id": "performances_011", "category": "performances", "angle": "MJ performing Earth Song at the 1996 BRIT Awards with Jarvis Cocker of Pulp protesting on stage"}, {"id": "performances_012", "category": "performances", "angle": "MJ's concert in Bucharest Romania in 1992 attended by 70,000 people after Communism ended filmed for HBO"}, {"id": "performances_013", "category": "performances", "angle": "MJ performing Dangerous for the first time live at the 1992 Grammy Awards"}, {"id": "performances_014", "category": "performances", "angle": "MJ's first concert performance in Australia in 1987 which sold out immediately and prompted additional dates"}, {"id": "performances_015", "category": "performances", "angle": "MJ's performance at the 30th Anniversary concerts at Madison Square Garden in September 2001"}, {"id": "performances_016", "category": "performances", "angle": "MJ's private performance for children at Great Ormond Street Hospital arranged during the Bad Tour 1988"}, {"id": "performances_017", "category": "performances", "angle": "MJ performing at the closing ceremony of the 1988 Seoul Olympics to a television audience of 3 billion people"}, {"id": "performances_018", "category": "performances", "angle": "MJ's televised performance on The Ed Sullivan Show as part of the Jackson 5 in 1969"}, {"id": "performances_019", "category": "performances", "angle": "MJ performing Don't Stop Til You Get Enough on Saturday Night Live in 1979 his first major solo TV performance"}, {"id": "performances_020", "category": "performances", "angle": "MJ's performance at Live Aid in 1985 was not included due to scheduling but he contributed financially"}, {"id": "performances_021", "category": "performances", "angle": "MJ's impromptu performance at a house party in Hollywood in 1982 documented by attendees"}, {"id": "performances_022", "category": "performances", "angle": "MJ performing at the 1993 Inaugural Gala for President Bill Clinton in Washington DC"}, {"id": "performances_023", "category": "performances", "angle": "MJ's first performance in South Africa at FNB Stadium in Johannesburg during the HIStory Tour 1997"}, {"id": "performances_024", "category": "performances", "angle": "MJ performing at the MTV Video Music Awards in 1995 reuniting with his brothers for a medley performance"}, {"id": "performances_025", "category": "performances", "angle": "MJ's concert in Moscow in 1996 the first major Western pop concert at Luzhniki Stadium documented by Russian press"}, {"id": "performances_026", "category": "performances", "angle": "MJ performing at Michael Jackson and Friends concert in Munich 1999 raising money for the Nelson Mandela Foundation"}, {"id": "performances_027", "category": "performances", "angle": "MJ's appearance on The Tonight Show with Jay Leno in 1992 to promote the Dangerous album"}, {"id": "performances_028", "category": "performances", "angle": "MJ performing at the anniversary concert for the United Negro College Fund in Washington DC in 1988"}, {"id": "performances_029", "category": "performances", "angle": "MJ's intimate charity performance for 100 invited guests at a benefit for AIDS research in Los Angeles in 1993"}, {"id": "performances_030", "category": "performances", "angle": "MJ performing Black or White for the first time on television at the 1991 Soul Train Music Awards"}, {"id": "performances_031", "category": "performances", "angle": "MJ's performance at the American Music Awards in 1980 where he debuted the robot dance move"}, {"id": "performances_032", "category": "performances", "angle": "MJ performing Rock With You at the 1980 Grammy Awards in his first Grammy performance appearance"}, {"id": "performances_033", "category": "performances", "angle": "MJ's concert in Warsaw Poland in 1996 the first major pop concert after the fall of the Iron Curtain in that city"}, {"id": "performances_034", "category": "performances", "angle": "MJ performing at the 2001 United We Stand benefit concert in Washington DC after September 11th"}, {"id": "performances_035", "category": "performances", "angle": "MJ's first sold-out performance in Japan in 1987 attended by the Japanese Emperor documented by local media"}, {"id": "performances_036", "category": "performances", "angle": "MJ performing at the Pasadena Civic Auditorium for the Soul Train Music Awards in 1983"}, {"id": "performances_037", "category": "performances", "angle": "MJ's surprise performance at a children's summer camp in 1990 documented by camp counselors"}, {"id": "performances_038", "category": "performances", "angle": "MJ performing Earth Song at the Nelson Mandela 46664 concert in Cape Town in 1996"}, {"id": "performances_039", "category": "performances", "angle": "MJ's private performance at Elizabeth Taylor's 65th birthday party in 1997 at Neverland Ranch"}, {"id": "performances_040", "category": "performances", "angle": "MJ performing at the Bambi Awards in Germany in 1995 his first European performance since the Dangerous Tour"}, {"id": "performances_041", "category": "performances", "angle": "MJ performing Jam live for the first time at the Dangerous Tour Munich opening night in 1992"}, {"id": "performances_042", "category": "performances", "angle": "MJ's performance at the opening of EuroDisney in Paris in 1992 for the press event"}, {"id": "performances_043", "category": "performances", "angle": "MJ performing at the HBO concert broadcast from New York's Madison Square Garden in 1981"}, {"id": "performances_044", "category": "performances", "angle": "MJ's first performance in Israel at Park Hayarkon in Tel Aviv during the HIStory Tour 1996"}, {"id": "performances_045", "category": "performances", "angle": "MJ performing in Lagos Nigeria during the HIStory Tour 1996 the first major Western pop artist to tour Nigeria"}, {"id": "performances_046", "category": "performances", "angle": "MJ's performance on the Oprah Winfrey Show in February 1993 watched by 90 million people in America"}, {"id": "performances_047", "category": "performances", "angle": "MJ performing in Prague during the HIStory Tour 1996 for 120,000 fans in one of the largest concerts in Czech history"}, {"id": "performances_048", "category": "performances", "angle": "MJ's performance at a children's charity event in Tokyo in 1987 where he performed without charge"}, {"id": "performances_049", "category": "performances", "angle": "MJ performing at the 1993 Grammy Awards just months before the first allegations became public"}, {"id": "relationships_000", "category": "relationships", "angle": "MJ and Elizabeth Taylor's 25-year friendship beginning when she visited him on the Thriller video set in 1982"}, {"id": "relationships_001", "category": "relationships", "angle": "Elizabeth Taylor introducing MJ to Marlon Brando and their documented three-way friendship throughout the 1990s"}, {"id": "relationships_002", "category": "relationships", "angle": "MJ and Marlon Brando becoming close friends in the 1990s with Brando spending time at Neverland Ranch"}, {"id": "relationships_003", "category": "relationships", "angle": "MJ's friendship with Sophia Loren beginning at a charity gala in Rome during the Bad Tour 1988"}, {"id": "relationships_004", "category": "relationships", "angle": "MJ and Macaulay Culkin's friendship beginning when MJ visited the set of Home Alone in 1990"}, {"id": "relationships_005", "category": "relationships", "angle": "MJ and Diana Ross's close relationship dating back to Motown and Ross's role as a mentor figure in his early career"}, {"id": "relationships_006", "category": "relationships", "angle": "Barry Gordy's description of MJ as the most naturally gifted performer he ever encountered at Motown"}, {"id": "relationships_007", "category": "relationships", "angle": "MJ and his father Joe's complicated documented relationship and MJ's statements about it in his 2001 Oxford speech"}, {"id": "relationships_008", "category": "relationships", "angle": "MJ and his mother Katherine's documented close relationship and his weekly phone calls to her throughout his career"}, {"id": "relationships_009", "category": "relationships", "angle": "MJ and Jackie Wilson's connection with MJ describing Wilson as the greatest live performer he ever witnessed"}, {"id": "relationships_010", "category": "relationships", "angle": "MJ and Sammy Davis Jr's friendship and Davis's documented influence on MJ's performance style"}, {"id": "relationships_011", "category": "relationships", "angle": "MJ and Fred Astaire's meeting and Astaire's documented comments about MJ's moonwalk being a great innovation"}, {"id": "relationships_012", "category": "relationships", "angle": "Gene Kelly calling MJ after the Motown 25 performance to praise his dancing documented in MJ's autobiography"}, {"id": "relationships_013", "category": "relationships", "angle": "MJ and Gregory Hines's friendship and their documented conversations about tap dance and its influence on MJ"}, {"id": "relationships_014", "category": "relationships", "angle": "MJ and Liza Minnelli's friendship and their documented collaboration discussions that never resulted in a project"}, {"id": "relationships_015", "category": "relationships", "angle": "MJ and Michael Jordan's documented friendship and their discussions about athletic peak performance"}, {"id": "relationships_016", "category": "relationships", "angle": "MJ and Mike Tyson's early friendship in the 1980s and their documented meetings at charity events"}, {"id": "relationships_017", "category": "relationships", "angle": "MJ and Steven Spielberg's creative friendship and Spielberg's documented descriptions of MJ's storytelling instincts"}, {"id": "relationships_018", "category": "relationships", "angle": "MJ and George Lucas collaborating on Captain EO and their documented creative discussions during production"}, {"id": "relationships_019", "category": "relationships", "angle": "MJ and Prince's competitive relationship documented in multiple interviews with both artists discussing each other"}, {"id": "relationships_020", "category": "relationships", "angle": "MJ and Bruce Lee's documented posthumous influence on MJ's martial arts training in the 1980s"}, {"id": "relationships_021", "category": "relationships", "angle": "MJ and Emmanuel Lewis's documented friendship and MJ's role as a big brother figure to the actor"}, {"id": "relationships_022", "category": "relationships", "angle": "MJ and David Bowie's mutual admiration documented in their separate interviews about each other's influence"}, {"id": "relationships_023", "category": "relationships", "angle": "MJ and Mick Jagger's friendship and their documented conversation about the business of touring in the 1980s"}, {"id": "relationships_024", "category": "relationships", "angle": "MJ and Paul McCartney's friendship before and after the ATV catalog purchase and their documented final meetings"}, {"id": "relationships_025", "category": "relationships", "angle": "MJ and John Lennon's brief meetings documented in photographs from the mid-1970s before Lennon's death"}, {"id": "relationships_026", "category": "relationships", "angle": "MJ and Whitney Houston's friendship and her documented comments about his influence on her vocal style"}, {"id": "relationships_027", "category": "relationships", "angle": "MJ and James Brown's documented meetings and Brown's statements about MJ being his greatest student"}, {"id": "relationships_028", "category": "relationships", "angle": "MJ and Stevie Wonder's lifelong friendship beginning at Motown and their documented studio collaborations"}, {"id": "relationships_029", "category": "relationships", "angle": "MJ and Smokey Robinson's friendship and Robinson's documented mentorship role during the early Jackson 5 years"}, {"id": "relationships_030", "category": "relationships", "angle": "MJ and Berry Gordy's relationship documented through the years from Motown through the ATV catalog controversy"}, {"id": "relationships_031", "category": "relationships", "angle": "MJ and Eddie Murphy's friendship and their documented behind-the-scenes interactions at industry events"}, {"id": "relationships_032", "category": "relationships", "angle": "MJ and Richard Pryor's friendship and MJ's documented description of Pryor as the funniest person he ever met"}, {"id": "relationships_033", "category": "relationships", "angle": "MJ and Bill Cosby's friendship during the 1980s documented in photographs and industry award ceremony appearances"}, {"id": "relationships_034", "category": "relationships", "angle": "MJ and David Geffen's business relationship and their documented conversations about independence from major labels"}, {"id": "relationships_035", "category": "relationships", "angle": "MJ and Brooke Shields's public friendship documented through their appearance together at multiple award shows"}, {"id": "relationships_036", "category": "relationships", "angle": "MJ and Sean Lennon's friendship and MJ's documented stories about visiting Lennon's son after his father's death"}, {"id": "relationships_037", "category": "relationships", "angle": "MJ and Celine Dion's documented mutual admiration and their discussions about the craft of singing"}, {"id": "relationships_038", "category": "relationships", "angle": "MJ and Elton John's friendship and John's documented comments about MJ's perfectionism in the studio"}, {"id": "relationships_039", "category": "relationships", "angle": "MJ and Barbara Streisand's documented mutual respect and their conversations about entertainment industry longevity"}, {"id": "influence_000", "category": "influence", "angle": "Usher's documented account of watching MJ perform on television as a child and deciding to become a performer"}, {"id": "influence_001", "category": "influence", "angle": "Justin Timberlake's specific statement in Rolling Stone that MJ's Off The Wall changed what he believed pop music could be"}, {"id": "influence_002", "category": "influence", "angle": "Bruno Mars describing learning the moonwalk at age four and practicing it daily for years in documented interviews"}, {"id": "influence_003", "category": "influence", "angle": "Beyonce's documented statement that MJ was the standard she measured herself against throughout her career"}, {"id": "influence_004", "category": "influence", "angle": "Chris Brown describing watching the Thriller video as a child and making his mother rewind it repeatedly"}, {"id": "influence_005", "category": "influence", "angle": "Ne-Yo stating in multiple interviews that he would not have become a songwriter without studying MJ's lyrical technique"}, {"id": "influence_006", "category": "influence", "angle": "Ciara describing MJ's influence on her dancing and the specific videos she studied to develop her movement style"}, {"id": "influence_007", "category": "influence", "angle": "Janet Jackson's documented statement that performing alongside her brother on the Dangerous Tour changed her live show"}, {"id": "influence_008", "category": "influence", "angle": "Alicia Keys describing MJ's Off The Wall as the album that made her want to learn piano and write music"}, {"id": "influence_009", "category": "influence", "angle": "Nicki Minaj's documented reference to MJ as the artist who showed her you could blend multiple styles successfully"}, {"id": "influence_010", "category": "influence", "angle": "Kanye West's documented statement that Thriller was the album that made him believe pop and art could coexist"}, {"id": "influence_011", "category": "influence", "angle": "Taylor Swift describing MJ's stadium show production values as the model she studied when planning her own tours"}, {"id": "influence_012", "category": "influence", "angle": "Rihanna citing MJ as the performer who showed her how to command a stage in her earliest documented interviews"}, {"id": "influence_013", "category": "influence", "angle": "Will.i.am's documented statement that MJ was the first artist who made him believe Black artists could achieve any level of success"}, {"id": "influence_014", "category": "influence", "angle": "Pharrell Williams describing studying MJ's voice for years to understand how he created tension and release vocally"}, {"id": "influence_015", "category": "influence", "angle": "Missy Elliott's documented description of how MJ's music video innovation directly influenced her approach to directing her own videos"}, {"id": "influence_016", "category": "influence", "angle": "Michael Buble describing MJ's vocal control as the technical achievement he most admired when he was learning to sing"}, {"id": "influence_017", "category": "influence", "angle": "Adam Levine's documented statement that MJ's falsetto on Off The Wall was the sound that made him want to sing"}, {"id": "influence_018", "category": "influence", "angle": "John Legend's description of MJ's approach to melody writing as the foundation of his own compositional technique"}, {"id": "influence_019", "category": "influence", "angle": "Choreographer Wade Robson's documented early career as a dancer who won a competition to perform with MJ at age seven"}, {"id": "influence_020", "category": "influence", "angle": "Choreographer Travis Payne describing his entire career philosophy as having been built on studying MJ's physicality"}, {"id": "influence_021", "category": "influence", "angle": "Music producer Darkchild Rodney Jerkins describing MJ's vocal direction in the studio as the most precise he ever witnessed"}, {"id": "influence_022", "category": "influence", "angle": "P Diddy's documented statement that MJ's business acumen in buying the Beatles catalog changed how he thought about ownership"}, {"id": "influence_023", "category": "influence", "angle": "Quincy Jones's documented description of MJ's musical instincts as the most naturally gifted he encountered in 50 years in music"}, {"id": "influence_024", "category": "influence", "angle": "Teddy Riley's specific account of MJ walking into the studio for Dangerous and demonstrating exactly how he wanted each track to sound"}, {"id": "influence_025", "category": "influence", "angle": "Director John Singleton describing MJ's Remember the Time video as the film that made him believe music videos could be cinema"}, {"id": "influence_026", "category": "influence", "angle": "The Weeknd's documented reference to MJ's vocal layering technique as the primary influence on his own recording process"}, {"id": "influence_027", "category": "influence", "angle": "Drake's documented statements about MJ being the reason he believed an artist could successfully shift musical styles"}, {"id": "influence_028", "category": "influence", "angle": "Frank Ocean citing MJ's ability to be vulnerable in lyrics while maintaining strength as a fundamental influence"}, {"id": "influence_029", "category": "influence", "angle": "Mariah Carey's documented description of studying MJ's ad-libs to understand how improvisation could serve a song"}, {"id": "influence_030", "category": "influence", "angle": "Jennifer Lopez's documented statement that MJ's dance training philosophy influenced how she approached combining singing and dancing"}, {"id": "influence_031", "category": "influence", "angle": "Lionel Richie's description of MJ's work ethic during the We Are the World session as inspiring even to veteran artists"}, {"id": "influence_032", "category": "influence", "angle": "Cardi B's documented statement in interviews that MJ showed her a Black artist could be the biggest in the world globally"}, {"id": "influence_033", "category": "influence", "angle": "Harry Styles's documented interviews citing MJ as the pop performer he studied most to understand stage presence"}, {"id": "influence_034", "category": "influence", "angle": "Ed Sheeran's documented reference to studying MJ's songwriting structure to understand how to write a pop hook"}, {"id": "influence_035", "category": "influence", "angle": "Sam Smith's documented statement that MJ's Thriller-era vocals were the template they studied learning to use their upper register"}, {"id": "influence_036", "category": "influence", "angle": "Tyler the Creator's documented reference to MJ's album sequencing as the reason he cares deeply about track order"}, {"id": "influence_037", "category": "influence", "angle": "Ariana Grande citing MJ's vocal runs and melisma technique as a primary influence on her approach to ornamentation"}, {"id": "influence_038", "category": "influence", "angle": "Lizzo's documented statement that MJ's dance combined with vocal performance showed her it was possible to do both at once"}, {"id": "influence_039", "category": "influence", "angle": "The choreographers of every major Super Bowl halftime act since 1993 citing MJ's performance as the benchmark"}]

def load_stories():
    """Load stories from volume file or fall back to embedded"""
    try:
        if os.path.exists(STORIES_FILE):
            with open(STORIES_FILE) as f:
                return _json.load(f)
    except Exception:
        pass
    return EMBEDDED_STORIES

def save_stories(stories):
    """Save stories to volume file"""
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        with open(STORIES_FILE, 'w') as f:
            _json.dump(stories, f)
        return True
    except Exception:
        return False

def load_used_ids():
    """Load set of used story IDs"""
    try:
        if os.path.exists(USED_FILE):
            with open(USED_FILE) as f:
                return set(_json.load(f))
    except Exception:
        pass
    return set()

def save_used_ids(used_ids):
    """Save used story IDs"""
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        with open(USED_FILE, 'w') as f:
            _json.dump(list(used_ids), f)
    except Exception:
        pass

def mark_stories_used(story_ids):
    """Mark stories as used"""
    used = load_used_ids()
    used.update(story_ids)
    # Keep last 400 used IDs (don't block forever)
    if len(used) > 400:
        used = set(list(used)[-400:])
    save_used_ids(used)

CATEGORY_WEIGHTS = {
    "humanitarian": 4,
    "personal_life": 4,
    "rare_moments": 3,
    "fashion": 2,
    "relationships": 2,
    "music_creation": 2,
    "achievements": 1,
    "performances": 1,
    "influence": 1,
}

def pick_stories(count, exclusions=None):
    """Pick count unique story angles, weighted and excluding recently used"""
    all_stories = load_stories()
    used_ids = load_used_ids()
    exclusions = exclusions or []
    excl_lower = [e.lower()[:50] for e in exclusions]
    
    # Build weighted pool - prefer unused stories
    unused_pool = []
    used_pool = []
    
    for story in all_stories:
        # Skip if topic was recently used via exclusion tracker
        angle_lower = story['angle'].lower()[:50]
        if any(angle_lower in e or e in angle_lower for e in excl_lower):
            continue
        weight = CATEGORY_WEIGHTS.get(story['category'], 1)
        if story['id'] in used_ids:
            used_pool.extend([story] * weight)
        else:
            unused_pool.extend([story] * weight)
    
    # Use unused first, fall back to used if needed
    pool = unused_pool if unused_pool else (used_pool if used_pool else all_stories)
    _random_mj.shuffle(pool)
    
    seen = set()
    result = []
    for story in pool:
        key = story['angle'][:40]
        if key not in seen and len(result) < count:
            seen.add(key)
            result.append(story)
    
    # Fill remainder if needed
    while len(result) < count:
        result.append(_random_mj.choice(all_stories))
    
    result = result[:count]
    # Mark as used
    mark_stories_used([s['id'] for s in result])
    return result

def pick_one_story(exclusions=None):
    return pick_stories(1, exclusions)[0]

# Keep PILLARS for backward compat
PILLARS = [s['angle'] for s in EMBEDDED_STORIES]


@mj_bp.route('/', methods=['GET'])
def studio():
    return Response(MJ_STUDIO_HTML, mimetype='text/html')


@mj_bp.route('/api/generate', methods=['POST'])
def generate():
    data       = request.get_json()
    count      = int(data.get('count', 19))
    override   = data.get('themeOverride', '').strip()
    tone       = data.get('tone', 'cinematic')
    cta        = data.get('cta', 'engagement')
    exclusions = data.get('exclusions', [])  # list of recently used topics

    tone_map = {
        'cinematic':     'cinematic, dramatic, and visually powerful',
        'emotional':     'deeply emotional, heartfelt, and moving',
        'nostalgic':     'warm, nostalgic, and celebratory of the past',
        'inspirational': 'uplifting, inspirational, and legacy-focused',
        'dramatic':      'bold, intense, and dramatically charged',
    }
    cta_map = {
        'engagement':  'end with a question that drives comments  -  ask fans to share their memories or thoughts',
        'tag':         'tell followers to tag a fellow MJ fan who needs to see this',
        'save':        'encourage saving or sharing this post',
        'follow':      'invite people to follow the page for more MJ content',
    }

    # Pick stories from database using weighted selection
    selected_stories = pick_stories(count, exclusions)

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'This page audience specifically responds best to: '
        '(1) Michael Jackson in regular everyday life - NOT on stage, NOT in signature performance outfits '
        '(2) His humanitarian work - hospital visits, charity, Heal the World '
        '(3) Behind-the-scenes genuine moments documented in named sources '
        '(4) Fashion that is NOT the red jacket, black military jacket, single glove, or fedora - show his OTHER documented styles '
        'ABSOLUTE RULES: '
        '1. NEVER default to Wembley Stadium, Thriller album recording, or Quincy Jones collaboration unless specifically requested '
        '2. NEVER invent quotes, private moments, or unverified details '
        '3. NEVER use concert scenes unless the pillar specifically requires it '
        '4. Every claim must be verifiable from a named source '
        '5. Vary the SCENE TYPE every single post - portrait, candid life moment, humanitarian event, fashion editorial, studio session with NON-Quincy collaborators '
        'REAL-PERSON LIKENESS RULE: Anchor Michael Jackson authentic likeness to correct era with specific physical descriptors. '
        'State it is the real Michael Jackson. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson social media image posts.

{"MANDATORY THEME OVERRIDE  -  you MUST focus ALL posts on this specific topic: " + override + ". Do not deviate. Every post must directly address this theme." if override else "Draw from these content pillars, varying across all " + str(count) + " posts:"}
{chr(10).join([f"{i+1}. Write about THIS SPECIFIC story angle: {s['angle']}" for i, s in enumerate(selected_stories)]) if not override else ""}

{"TOPICS YOU MUST COMPLETELY AVOID  -  these have been used recently and MUST NOT appear in any form:" + chr(10) + chr(10).join(["- " + e for e in exclusions]) + chr(10) + "Do not reference these people, albums, tours, songs, or themes in any post. Find completely different angles." if exclusions else ""}

IMAGE PROMPT FORMAT - STRICT VISUAL VARIETY REQUIRED:
Rotate through different scene types  -  studio, portrait, backstage, humanitarian, rehearsal, candid, album/era artistic, interview.
ONLY use concert scenes if the pillar specifically calls for it.
Each image must anchor Michael Jackson authentic likeness to the correct era with specific physical descriptors.
State it is the real Michael Jackson (not an actor or tribute artist).
End with: "Optimized for 1080x1350 format."

CAPTION FORMAT  -  exactly 3 full paragraphs. Tone: {{tone_map[tone]}}
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis.
Paragraph 2: Develops the story with documented facts only  -  no invented details.
Paragraph 3: Clear engagement CTA  -  {{cta_map[cta]}}. Include 2 emojis.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, one documented verifiable fact + "Tag a friend" CTA. Never hashtags.

For each post include: "pillar" (2-3 word topic label  -  be SPECIFIC, e.g. "Off The Wall recording" not just "album")
and "topics_used" (comma-separated list of the specific topics, people, albums, songs referenced in this post)

JSON: {{"posts":[{{"imagePrompt":"...","caption":"...","firstComment":"...","pillar":"...","topics_used":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':8000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=180
        )
        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout  -  try generating fewer posts (5-8 at a time)'}), 500
        if 'error' in result:
            return jsonify({'ok':False,'error':result['error'].get('message','API error')}), 500
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        posts = json.loads(raw)
        return jsonify({'ok':True,'posts':posts['posts']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@mj_bp.route('/api/generate-banner', methods=['POST'])
def generate_banner():
    data     = request.get_json()
    count    = int(data.get('count', 3))
    override = data.get('themeOverride', '').strip()

    story = pick_one_story(exclusions)
    pillar = override if override else story['angle']

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'Generate typographic banner concepts  -  no people, no photography, text on gradient background only. '
        'Banners must be vibrant, scroll-stopping, and emotionally powerful. '
        'The banner text must always be a QUESTION that invites comments, not a declarative statement. '
        'Strictly based on documented, publicly verifiable facts about Michael Jackson. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson typographic banner concepts.
{theme_note}Draw from this content pillar: {pillar}

BANNER FORMAT  -  typographic only, no people or photography:
- Vibrant saturated color gradients matched to the emotional mood  -  electric blues, deep purples, fiery oranges, emerald greens, golden bursts
- Strong contrast between lettering and background required
- Soft glow behind text, gradient or lit-from-within lettering, or dramatic radial burst
- The sole visual element is bold centered text
- The text must be a QUESTION that invites comments (not a declarative statement)
- Heavy condensed sans-serif font, bright lettering with glow effect
- Stack text across 2-3 lines for visual rhythm
- End description with: "No people, no instruments, no illustrations, no photography. Text on gradient background only. Optimized for 1080x1350 format."

CAPTION FORMAT  -  exactly 3 full paragraphs:
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis tied to the banner question.
Paragraph 2: Context and story behind the question  -  documented facts only.
Paragraph 3: Clear engagement CTA inviting followers to answer the question in comments and follow.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, documented fact + "Tag a friend" CTA. Never hashtags.

JSON: {{"banners":[{{"bannerPrompt":"...","caption":"...","firstComment":"...","pillar":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':6000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )
        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout  -  please try again'}), 500
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        banners = json.loads(raw)
        return jsonify({'ok':True,'banners':banners['banners']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@mj_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    data       = request.get_json()
    video_type = data.get('videoType', 'short')
    count      = int(data.get('count', 3))
    override   = data.get('themeOverride', '').strip()
    exclusions = data.get('exclusions', [])

    # Use override if provided, otherwise weighted random pillar
    story = pick_one_story(exclusions)
    pillar = override if override else story['angle']

    if video_type == 'short':
        duration_rules = "SHORT-FORM 12 seconds (~30 words): 2-4 scene changes, powerful hook in first line, loopable ending, Hypernatural optimized"
        word_guide = "approximately 30 words (12 seconds at 2.5 words/second)"
    else:
        duration_rules = "LONG-FORM 60 seconds (~150 words): powerful scroll-stopping hook, emotionally resonant story, escalating momentum, strong CTA ending, Hypernatural optimized"
        word_guide = "approximately 150 words (60 seconds at 2.5 words/second)"

    system_prompt = (
        'You are the video director for a viral Michael Jackson tribute page. '
        'This audience responds best to: humanitarian stories (hospital visits, charity work), '
        'MJ in regular everyday life, genuine behind-the-scenes documented moments, '
        'and stories that reveal WHO HE WAS as a person - not just the performer. '
        'ABSOLUTE RULES: '
        '1. NEVER default to Wembley Stadium, Thriller album recording, or Quincy Jones collaboration unless requested '
        '2. NEVER invent quotes, private on-set moments, or unverified details '
        '3. Every claim must be verifiable from a named source '
        '4. ABSOLUTELY NO EMOJIS in script body - plain text only '
        '5. Do NOT repeat topics that appear in the exclusion list '
        'The real MJ humanitarian and personal stories are extraordinary - they never need fabrication. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson video narration scripts.
{theme_note}Draw from this content pillar: {pillar}
Rules: {duration_rules}

VIDEO SCRIPT FORMAT  -  spoken narration only:
- {word_guide}
- Open with a powerful hook in the very first line that stops the scroll
- Tell a true, emotionally resonant story using documented facts
- Short punchy lines with line breaks for pacing
- Build emotional momentum throughout
- End with a clear CTA: ask viewers to drop a comment and follow
- ABSOLUTELY NO EMOJIS in the script  -  plain text only
- NO shot descriptions, camera directions, or visual notes

Also generate for each video:
- "imagePrompt": A cinematic still image prompt for this video's key scene. For use in OpenArt. Must include Michael Jackson's authentic likeness anchored to the correct era with specific physical descriptors. State it is the real Michael Jackson. End with "Optimized for 1080x1350 format."

CAPTION FORMAT  -  exactly 3 full paragraphs (written AFTER the script, separate deliverable):
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis
Paragraph 2: Develops the story and context from the script with documented details
Paragraph 3: Clear engagement CTA asking viewers to comment and follow. Include 2 emojis.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, memorable documented fact + "Tag a friend" CTA. Never hashtags.

JSON: {{"videos":[{{"videoScript":"...","imagePrompt":"...","captionAndHashtags":"...","firstComment":"...","pillar":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':8000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )
        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout  -  please try again'}), 500
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        videos = json.loads(raw)
        return jsonify({'ok':True,'videos':videos['videos'],'videoType':video_type})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500




@mj_bp.route('/api/story-stats', methods=['GET'])
def story_stats():
    """Return story database stats for the counter display"""
    try:
        all_stories = load_stories()
        used_ids = load_used_ids()
        total = len(all_stories)
        used = len([s for s in all_stories if s['id'] in used_ids])
        unused = total - used
        days_remaining = round(unused / 15) if unused > 0 else 0  # estimate 15 posts/day
        
        by_category = {}
        for s in all_stories:
            cat = s['category']
            if cat not in by_category:
                by_category[cat] = {'total': 0, 'used': 0}
            by_category[cat]['total'] += 1
            if s['id'] in used_ids:
                by_category[cat]['used'] += 1
        
        return jsonify({
            'ok': True,
            'total': total,
            'used': used,
            'unused': unused,
            'days_remaining': days_remaining,
            'by_category': by_category,
            'using_volume': os.path.exists(STORIES_FILE)
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@mj_bp.route('/api/refresh-stories', methods=['POST'])
def refresh_stories():
    """Generate 400 new story angles and append to database"""
    try:
        all_stories = load_stories()
        existing_angles = [s['angle'] for s in all_stories]
        total_existing = len(existing_angles)
        
        # Sample of existing to pass as context (avoid 400+ item list in prompt)
        sample_existing = existing_angles[-80:] if len(existing_angles) > 80 else existing_angles
        existing_sample_str = '\n'.join([f'- {a[:80]}' for a in sample_existing])
        
        categories = {
            "humanitarian": 70,
            "personal_life": 60,
            "rare_moments": 50,
            "fashion": 40,
            "music_creation": 50,
            "achievements": 30,
            "performances": 40,
            "relationships": 40,
            "influence": 20,
        }
        
        category_focuses = {
            "humanitarian": "hospital visits with specific hospital names and dates, specific charity donations with amounts, Heal the World specific programs, documented meetings with world leaders for charity causes",
            "personal_life": "documented off-stage moments - hobbies, shopping trips, theme park visits, time with family, daily routines from named interviews, food preferences, reading habits",
            "rare_moments": "verified candid moments from named books or interviews - specific interactions with strangers, documented off-camera kindness from named crew or staff sources",
            "fashion": "specific documented outfits with designers where known - focus on OFF-STAGE looks, different eras, non-signature items beyond the red jacket and glove",
            "music_creation": "specific songs being created with named collaborators, specific studio sessions with engineers named, specific creative decisions documented in interviews",
            "achievements": "specific Guinness records with verified numbers, specific Billboard chart firsts with exact dates, Grammy wins by specific category",
            "performances": "specific TV performances with dates and channels, specific concert moments from named critics, performances beyond the obvious iconic ones",
            "relationships": "documented friendships with specific moments from named sources - Elizabeth Taylor, Marlon Brando, Macaulay Culkin, Diana Ross, specific conversations documented",
            "influence": "specific named artists in documented interviews with approximate quotes, specific choreographers citing MJ, documented moments of influence being traced",
        }
        
        new_stories = []
        
        for category, target_count in categories.items():
            system_prompt = (
                'You are a Michael Jackson content researcher. Generate specific, documented story angles. '
                'Each must be: SPECIFIC (names, dates, locations where known), VERIFIABLE (public record), '
                'UNIQUE (different from all examples shown), HONEST (only documented details). '
                'Format: one sentence per angle. Respond ONLY with a JSON array of strings.'
            )
            
            user_prompt = f"""Generate exactly {target_count} new unique Michael Jackson story angles for category: {category.upper().replace('_', ' ')}

Focus on: {category_focuses.get(category, 'varied documented moments')}

These must be COMPLETELY DIFFERENT from these existing angles (sample shown):
{existing_sample_str[:3000]}

Return ONLY a JSON array: ["angle 1", "angle 2", ...]"""
            
            resp = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'}},
                json={{'model':'claude-sonnet-4-20250514','max_tokens':4000,'system':system_prompt,
                      'messages':[{{'role':'user','content':user_prompt}}]}},
                timeout=120
            )
            
            try:
                result = resp.json()
                raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
                angles = json.loads(raw)
                for i, angle in enumerate(angles):
                    if isinstance(angle, str) and len(angle) > 20:
                        new_stories.append({{
                            'id': f'{{category}}_r{{total_existing + len(new_stories):04d}}',
                            'category': category,
                            'angle': angle
                        }})
            except Exception as e:
                continue  # Skip failed categories
        
        if not new_stories:
            return jsonify({{'ok': False, 'error': 'No new stories generated'}}), 500
        
        # Append to existing
        combined = all_stories + new_stories
        
        # Save to volume
        saved = save_stories(combined)
        
        return jsonify({{
            'ok': True,
            'new_count': len(new_stories),
            'total_count': len(combined),
            'saved_to_volume': saved,
            'message': f'Added {{len(new_stories)}} new story angles. Database now has {{len(combined)}} total stories.'
        }})
        
    except Exception as e:
        return jsonify({{'ok': False, 'error': str(e)}}), 500

@mj_bp.route('/api/image', methods=['POST'])
def generate_image():
    data = request.get_json()
    prompt = data.get('prompt', '')
    key = data.get('geminiKey') or GEMINI_KEY
    if not key:
        return jsonify({'ok':False,'error':'No Gemini API key configured'}), 400
    models = ['gemini-2.5-flash-image','gemini-2.0-flash-preview-image-generation']
    last_error = ''
    for model in models:
        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
            r = requests.post(url, json={'contents':[{'parts':[{'text':prompt}],'role':'user'}],
                'generationConfig':{'responseModalities':['TEXT','IMAGE']}}, timeout=60)
            d = r.json()
            if 'error' in d: last_error = f"{model}: {d['error']['message']}"; continue
            parts = d.get('candidates',[{}])[0].get('content',{}).get('parts',[])
            img_part = next((p for p in parts if 'inlineData' in p), None)
            if not img_part: last_error = f'{model}: No image'; continue
            return jsonify({'ok':True,'dataUrl':f"data:{img_part['inlineData']['mimeType']};base64,{img_part['inlineData']['data']}",'model':model})
        except Exception as e:
            last_error = f'{model}: {str(e)}'; continue
    return jsonify({'ok':False,'error':last_error}), 500


@mj_bp.route('/api/schedule-buffer', methods=['POST'])
def schedule_buffer():
    data = request.get_json()
    buffer_token = data.get('bufferToken','')
    profile_ids  = data.get('profileIds',[])
    caption      = data.get('caption','')
    image_b64    = data.get('imageB64','')
    sched_time   = int(data.get('scheduledTime',0))
    if not buffer_token or not profile_ids or not caption:
        return jsonify({'ok':False,'error':'Missing required fields'}), 400
    try:
        media_id = None
        if image_b64:
            header, encoded = image_b64.split(',', 1)
            img_bytes = base64.b64decode(encoded)
            up = requests.post('https://api.bufferapp.com/1/media/upload.json',
                headers={'Authorization':f'Bearer {buffer_token}'},
                files={'file':('image.jpg',img_bytes,'image/jpeg')}, timeout=30)
            if up.json().get('id'): media_id = up.json()['id']
        results = []
        for pid in profile_ids:
            payload = {'text':caption,'profile_ids[]':pid,'scheduled_at':sched_time}
            if media_id: payload['media[id]'] = media_id
            pr = requests.post('https://api.bufferapp.com/1/updates/create.json',
                headers={'Authorization':f'Bearer {buffer_token}'}, data=payload, timeout=30)
            pd = pr.json()
            results.append({'profileId':pid,'updateId':pd.get('updates',[{}])[0].get('id','') if pd.get('success') else str(pd)})
        return jsonify({'ok':True,'results':results})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500
MJ_STUDIO_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MJ Content Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-light:#E8C97A;--gold-dim:#9A7A35;--black:#0D0D0D;--dark:#111;--dark2:#181818;--dark3:#222;--border:rgba(201,168,76,0.18);--text:#F0EAD6;--muted:#7A7060;--hint:#4A4438;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DM Sans",sans-serif;background:var(--black);color:var(--text);min-height:100vh;font-size:14px;}
header{background:var(--dark);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;}
.logo{font-family:"Bebas Neue",sans-serif;font-size:22px;letter-spacing:.1em;color:var(--gold);line-height:1;}
.logo span{color:var(--muted);font-size:10px;font-family:"DM Sans",sans-serif;font-weight:400;letter-spacing:.15em;text-transform:uppercase;display:block;margin-top:1px;}
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;} .mobile-menu-btn{display:none;}
.layout{display:grid;grid-template-columns:200px 1fr;min-height:calc(100vh - 58px);}
.sidebar{background:var(--dark);border-right:1px solid var(--border);padding:16px 12px;overflow-y:auto;}
.s-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--dark3);}
.s-section{margin-bottom:20px;}
.s-label{font-size:11px;color:var(--muted);margin-bottom:5px;display:block;}
.s-field{margin-bottom:11px;}
.s-field select,.s-field input{width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:7px 9px;font-family:"DM Sans",sans-serif;font-size:12px;color:var(--text);outline:none;}
.s-field select:focus,.s-field input:focus{border-color:var(--gold-dim);}
.chip-row{display:flex;flex-wrap:wrap;gap:5px;}
.chip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);transition:all .15s;font-weight:500;}
.chip.on{background:rgba(201,168,76,.12);border-color:var(--gold-dim);color:var(--gold);}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.stat-box{background:var(--dark3);border-radius:5px;padding:8px;text-align:center;}
.stat-num{font-family:"Bebas Neue",sans-serif;font-size:26px;color:var(--gold);letter-spacing:.04em;line-height:1;}
.stat-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-top:2px;}
.main{display:flex;flex-direction:column;}
.tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 20px;flex-wrap:wrap;}
.tab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
.tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.pane{display:none;padding:20px;overflow-y:auto;flex:1;}
.pane.on{display:block;}
.gen-box{background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;}
.gen-box p{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6;}
.override-row{display:flex;gap:10px;margin-bottom:10px;}
.override-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.override-row input:focus{border-color:var(--gold-dim);}
.btn-row{display:flex;gap:8px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 18px;border-radius:5px;font-family:"DM Sans",sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
.btn-gold{background:linear-gradient(135deg,var(--gold-dim),var(--gold-light));color:var(--black);}
.btn-gold:hover{filter:brightness(1.08);transform:translateY(-1px);}
.btn-dark{background:var(--dark3);color:var(--muted);border:1px solid var(--dark3);}
.btn-dark:hover{border-color:var(--border);color:var(--text);}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--dark3);}
.btn-ghost:hover{border-color:var(--border);color:var(--gold);}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;}
.prog-wrap{margin-top:14px;}
.prog-track{height:3px;background:var(--dark3);border-radius:99px;overflow:hidden;}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold-light));border-radius:99px;width:0%;transition:width .4s;}
.prog-label{font-size:11px;color:var(--hint);text-align:center;margin-top:6px;}
.content-list{display:flex;flex-direction:column;gap:10px;}
.content-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;}
.content-card:hover{border-color:var(--border);}
.card-head{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);min-width:28px;}
.card-pillar{font-size:10px;color:var(--gold-dim);background:rgba(201,168,76,.1);padding:2px 8px;border-radius:3px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.card-type{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.type-image{background:rgba(99,153,34,.1);color:#639922;}
.type-banner{background:rgba(138,43,226,.15);color:#B87FFF;}
.type-short{background:rgba(74,128,184,.1);color:#7AAAD4;}
.type-long{background:rgba(170,100,34,.1);color:#D4AA7A;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;margin-left:auto;}
.card-body{display:grid;grid-template-columns:1fr 150px;}
.card-text{padding:12px 14px;border-right:1px solid var(--dark3);}
.sec-tabs{display:flex;border-bottom:1px solid var(--dark3);margin:-12px -14px 10px;}
.sec-tab{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:7px 10px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.sec-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.sec-pane{display:none;}
.sec-pane.on{display:block;}
.section-text{font-size:12px;line-height:1.75;color:var(--text);white-space:pre-wrap;}
.section-text.prompt{font-style:italic;color:var(--muted);border-left:2px solid var(--gold-dim);padding-left:8px;}
.first-comment-block{margin-top:8px;padding:8px 10px;background:var(--dark3);border-radius:5px;border-left:2px solid var(--gold-dim);}
.first-comment-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;}
.first-comment-text{font-size:12px;color:var(--muted);line-height:1.6;}
.card-img-col{padding:12px;display:flex;flex-direction:column;gap:6px;align-items:center;background:var(--dark3);}
.drop-zone{width:126px;height:126px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.dz-icon{font-size:22px;color:var(--hint);}
.drop-zone span{font-size:10px;color:var(--hint);text-align:center;line-height:1.4;}
.banner-placeholder{width:126px;height:126px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#1a0a2e,#2d1b4e);font-size:10px;color:#B87FFF;text-align:center;padding:8px;}
.img-gen{width:126px;height:126px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--dark2);font-size:10px;color:var(--hint);text-align:center;}
.img-preview{width:126px;height:126px;object-fit:cover;border-radius:6px;cursor:pointer;}
.spinner{width:20px;height:20px;border:2px solid var(--dark3);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.card-foot{display:flex;align-items:center;gap:6px;padding:8px 14px;border-top:1px solid var(--dark3);background:var(--dark3);flex-wrap:wrap;}
.s-dot{width:6px;height:6px;border-radius:50%;background:var(--dark3);flex-shrink:0;}
.dot-r{background:#639922;}.dot-p{background:var(--gold-dim);animation:pulse 1.2s infinite;}.dot-s{background:#1D9E75;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.s-txt{font-size:11px;color:var(--muted);flex:1;}
.mbtn{font-size:11px;padding:3px 8px;color:var(--muted);border:1px solid var(--dark3);background:var(--dark2);border-radius:4px;cursor:pointer;font-family:"DM Sans",sans-serif;transition:all .15s;font-weight:500;}
.mbtn:hover{border-color:var(--gold-dim);color:var(--gold);}
.mbtn:disabled{opacity:.35;cursor:not-allowed;}
.mbtn-gold{border-color:var(--gold-dim)!important;color:var(--gold)!important;}
.sched-table{border:1px solid var(--dark3);border-radius:8px;overflow:hidden;}
.sched-head{display:grid;grid-template-columns:36px 60px 1fr 110px 90px;gap:8px;padding:8px 12px;background:var(--dark3);font-size:10px;color:var(--hint);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--dark3);}
.sched-row{display:grid;grid-template-columns:36px 60px 1fr 110px 90px;gap:8px;padding:9px 12px;font-size:12px;border-bottom:1px solid var(--dark3);background:var(--dark2);align-items:center;}
.sched-row:last-child{border-bottom:none;}
.s-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);}
.pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;}
.pill-p{background:rgba(201,168,76,.1);color:var(--gold-dim);}
.pill-r{background:rgba(99,153,34,.12);color:#639922;}
.pill-s{background:rgba(29,158,117,.12);color:#1D9E75;}
.setup-sec{background:var(--dark2);border:1px solid var(--dark3);border-radius:8px;padding:18px;margin-bottom:12px;}
.setup-sec h3{font-size:15px;font-weight:500;margin-bottom:6px;}
.setup-sec p{font-size:12px;color:var(--muted);line-height:1.65;margin-bottom:14px;}
.step-list{list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:9px;margin-bottom:14px;}
.step-list li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.55;}
.step-list li::before{content:counter(s);min-width:19px;height:19px;background:rgba(201,168,76,.15);color:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px;}
.alert{padding:10px 13px;border-radius:0 5px 5px 0;font-size:12px;line-height:1.6;margin-bottom:12px;border-left:2px solid;}
.alert-gold{background:rgba(201,168,76,.07);color:var(--gold);border-color:var(--gold-dim);}
.alert-ok{background:rgba(29,158,117,.07);color:#1D9E75;border-color:#1D9E75;}
.alert-err{background:rgba(170,61,61,.08);color:#D48A8A;border-color:#AA3D3D;}
.alert-info{background:rgba(74,128,184,.08);color:#7AAAD4;border-color:#4A80B8;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
code{background:var(--dark3);padding:1px 6px;border-radius:3px;font-size:11px;color:var(--gold);font-family:monospace;}
.empty{text-align:center;padding:60px 20px;color:var(--hint);}
.empty-icon{font-size:44px;margin-bottom:14px;display:block;}
.empty h3{font-family:"Bebas Neue",sans-serif;font-size:24px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;}
.empty p{font-size:13px;line-height:1.7;max-width:320px;margin:0 auto;}
.toast{position:fixed;bottom:20px;right:20px;background:var(--dark2);color:var(--gold-light);border:1px solid var(--border);padding:11px 18px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(80px);opacity:0;transition:all .3s;z-index:9999;max-width:320px;}
.toast.show{transform:translateY(0);opacity:1;}

/* ── MOBILE RESPONSIVE ─────────────────────────────────── */
@media (max-width: 680px) {

  /* Header */
  header { padding: 0 14px; gap: 8px; }
  .logo { font-size: 18px; }
  .logo span { display: none; }
  .hdr-actions { gap: 6px; }
  .hdr-actions a, .hdr-actions button { font-size: 10px !important; padding: 4px 8px !important; }

  /* Layout — sidebar hidden by default on mobile */
  .layout { grid-template-columns: 1fr; }
  .sidebar {
    display: none;
    position: fixed;
    top: 58px; left: 0; right: 0; bottom: 0;
    z-index: 200;
    overflow-y: auto;
    border-right: none;
    border-top: 1px solid var(--border);
  }
  .sidebar.open { display: block; }
  .main { min-width: 0; }

  /* Mobile menu button */
  .mobile-menu-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 34px; height: 34px;
    background: var(--dark3);
    border: 1px solid var(--dark3);
    border-radius: 5px;
    cursor: pointer;
    color: var(--muted);
    font-size: 16px;
    flex-shrink: 0;
  }
  .mobile-menu-btn.on { border-color: var(--gold-dim); color: var(--gold); }

  /* Tabs — horizontal scroll */
  .tabs { padding: 0 10px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { padding: 10px 10px; font-size: 10px; white-space: nowrap; flex-shrink: 0; }

  /* Pane padding */
  .pane { padding: 12px; }

  /* Gen/theme boxes */
  .gen-box, .theme-box { padding: 12px; }
  .gen-box p, .theme-box p { font-size: 11px; margin-bottom: 10px; }
  .override-row, .theme-row { flex-direction: column; gap: 8px; }
  .override-row input, .theme-row input { width: 100%; }
  .btn-row { flex-direction: column; }
  .btn-row .btn { width: 100%; }
  .btn { font-size: 12px; padding: 10px 14px; }
  .quick-row { gap: 4px; }
  .qchip { font-size: 10px; }

  /* Cards — stack image below text */
  .card-body { grid-template-columns: 1fr; }
  .card-text { border-right: none; border-bottom: 1px solid var(--dark3); padding: 10px 12px; }
  .card-img-col {
    padding: 10px 12px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    background: var(--dark3);
    justify-content: flex-start;
  }
  .drop-zone, .img-preview, .img-gen, .banner-placeholder {
    width: 80px !important; height: 80px !important;
  }
  .drop-zone span { font-size: 9px; }
  .dz-icon { font-size: 18px; }

  /* Card head */
  .card-head { padding: 8px 12px; flex-wrap: wrap; gap: 6px; }
  .card-time { margin-left: 0; }

  /* Card foot */
  .card-foot { padding: 8px 12px; gap: 5px; }
  .mbtn { font-size: 10px; padding: 4px 8px; }
  .s-txt { font-size: 10px; width: 100%; order: -1; margin-bottom: 2px; }

  /* Section text */
  .section-text { font-size: 11px; }
  .first-comment-text { font-size: 11px; }

  /* Batch bar */
  .batch-bar { padding: 8px 10px; gap: 6px; }
  .batch-bar .btn { font-size: 10px !important; padding: 6px 10px !important; width: auto; }
  .batch-msg { font-size: 10px; width: 100%; }

  /* Schedule table */
  .sched-head { grid-template-columns: 28px 50px 1fr 80px; font-size: 9px; padding: 6px 10px; }
  .sched-row { grid-template-columns: 28px 50px 1fr 80px; font-size: 10px; padding: 7px 10px; }
  .sched-head span:nth-child(5), .sched-row span:nth-child(5),
  .sched-head span:last-child, .sched-row .pill { display: none; }

  /* Settings modal */
  #settings-modal > div { width: 95vw !important; padding: 20px !important; }

  /* Stat grid */
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .stat-num { font-size: 22px; }

  /* Toast */
  .toast { left: 10px; right: 10px; max-width: none; bottom: 14px; }

  /* Two col forms */
  .two-col { grid-template-columns: 1fr; }

  /* Progress */
  .prog-label { font-size: 10px; }
}


/* ── MOBILE READABILITY ────────────────────────────────── */
@media (max-width: 680px) {
  /* Larger base font */
  body { font-size: 15px; }

  /* Sidebar text */
  .s-title { font-size: 11px; color: #7A7A7A; }
  .s-label { font-size: 12px; color: #A0A090; }
  .s-field select, .s-field input { font-size: 13px; color: var(--text); }

  /* Chip text */
  .chip { font-size: 12px; padding: 5px 11px; color: #A0A090; }
  .chip.on { color: var(--gold-light); }

  /* Stat boxes */
  .stat-num { font-size: 28px; }
  .stat-lbl { font-size: 10px; color: #7A7A7A; }

  /* Tab labels */
  .tab { font-size: 11px; color: #A0A090; }
  .tab.on { color: var(--gold-light); }

  /* Gen box text */
  .gen-box p, .theme-box p { font-size: 13px; color: #A0A090; line-height: 1.65; }
  .day-name-d { font-size: 18px; }
  .day-focus-d { font-size: 12px; color: #A0A090; }

  /* Card head */
  .card-num { font-size: 18px; }
  .card-meta, .card-era { font-size: 12px; }
  .card-time { font-size: 12px; }

  /* Section content - most important */
  .section-text { font-size: 14px; line-height: 1.8; color: #E8E0CC; }
  .section-text.prompt { font-size: 13px; color: #B0A890; }
  .first-comment-text { font-size: 13px; color: #B0A890; line-height: 1.7; }
  .first-comment-label { font-size: 10px; color: #7A7A7A; }

  /* Sec tabs */
  .sec-tab { font-size: 11px; padding: 8px 10px; color: #8A8070; }
  .sec-tab.on { color: var(--gold-light); }

  /* Card footer */
  .s-txt { font-size: 12px; color: #A0A090; }
  .mbtn { font-size: 12px; padding: 5px 10px; color: #A0A090; }
  .mbtn-gold { color: var(--gold-light) !important; }

  /* Batch bar */
  .batch-msg { font-size: 12px; }

  /* Logo */
  .logo { font-size: 20px; }

  /* Pillar note in sidebar */
  .sidebar div[style*="font-size:11px"] { font-size: 12px !important; color: #8A8070 !important; line-height: 1.75 !important; }

  /* Input placeholders */
  input::placeholder { color: #6A6458; font-size: 13px; }
  select { color: var(--text); }

  /* Progress label */
  .prog-label { font-size: 12px; color: #A0A090; }

  /* Schedule table */
  .sched-row { font-size: 12px; }
  .s-num { font-size: 18px; }

  /* Empty state */
  .empty h3 { font-size: 20px; }
  .empty p { font-size: 13px; color: #8A8070; }

  /* Btn text */
  .btn { font-size: 13px; }
  .btn-gold { font-size: 13px; }

  /* Quick chips */
  .qchip { font-size: 12px; padding: 5px 10px; color: #8A8070; }
}

</style>
</head>
<body>

<header>
  <div class="logo">MJ Content Studio<span>Michael Jackson Tribute Page</span></div>
  <button class="mobile-menu-btn" id="mobile-menu-btn">&#9776;</button>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" id="settings-btn">&#9881; Settings</button>
    <a href="/tdm" class="btn btn-ghost" style="font-size:11px;padding:5px 12px;">Switch to TDM</a>
  </div>
</header>

<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:460px;max-width:90vw;">
    <h2 style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:4px;">Studio Settings</h2>
    <div style="font-size:11px;color:var(--hint);margin-bottom:16px;" id="topic-count-display">Loading topic history...</div>
    <div class="s-field"><label class="s-label">Buffer Access Token</label><input type="password" id="set-buffer" placeholder="Paste your Buffer access token..."></div>
    <div class="s-field"><label class="s-label">Buffer Profile IDs (comma-separated)</label><input type="text" id="set-profiles" placeholder="e.g. 69e8277c031bfa423c2c788d,..."></div>
    <div class="s-field"><label class="s-label">Gemini API Key (optional)</label><input type="password" id="set-gemini" placeholder="AIza..."></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-gold" id="save-settings-btn" style="flex:1;">Save Settings</button>
      <button class="btn btn-dark" onclick="clearTopicHistory()" style="font-size:11px;">&#8635; Clear Topic History</button>
      <button class="btn btn-ghost" id="cancel-settings-btn">Cancel</button>
    </div>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--dark3);">
      <div style="font-size:11px;color:var(--hint);margin-bottom:8px;" id="settings-story-stats">Loading story stats...</div>
      <button class="btn btn-dark" id="refresh-stories-btn" style="width:100%;font-size:12px;" onclick="runStoryRefresh()">
        &#10024; Generate 400 New Story Angles
      </button>
      <div id="refresh-status" style="font-size:11px;color:var(--hint);margin-top:6px;display:none;"></div>
    </div>
    <div style="display:none;">
    </div>
  </div>
</div>

<div class="layout">
  <div class="sidebar">
    <div class="s-section">
      <div class="s-title">Session Stats</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-num" id="s-images">0</div><div class="stat-lbl">Images</div></div>
        <div class="stat-box"><div class="stat-num" id="s-banners">0</div><div class="stat-lbl">Banners</div></div>
        <div class="stat-box"><div class="stat-num" id="s-videos">0</div><div class="stat-lbl">Videos</div></div>
        <div class="stat-box"><div class="stat-num" id="s-sched">0</div><div class="stat-lbl">Scheduled</div></div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Post Settings</div>
      <div class="s-field"><label class="s-label">Image posts per day</label>
        <select id="post-count">
          <option value="1">1 post</option>
          <option value="2">2 posts</option>
          <option value="3">3 posts</option>
          <option value="4">4 posts</option>
          <option value="5">5 posts</option>
          <option value="6">6 posts</option>
          <option value="7">7 posts</option>
          <option value="8">8 posts</option>
          <option value="9">9 posts</option>
          <option value="10" selected>10 posts</option>
          <option value="11">11 posts</option>
          <option value="12">12 posts</option>
          <option value="13">13 posts</option>
          <option value="14">14 posts</option>
          <option value="15">15 posts</option>
          <option value="16">16 posts</option>
          <option value="17">17 posts</option>
          <option value="18">18 posts</option>
          <option value="19">19 posts</option>
          <option value="20">20 posts</option>
        </select>
      </div>
      <div class="s-field"><label class="s-label">First post time</label><input type="text" id="start-time" value="8:00 AM"></div>
      <div class="s-field"><label class="s-label">Interval (minutes)</label><input type="text" id="interval" value="45"></div>
    </div>
    <div class="s-section">
      <div class="s-title">Story Database</div>
      <div id="story-counter" style="font-size:11px;color:var(--hint);line-height:1.8;">
        Loading...
      </div>
      <button onclick="refreshStoryStats()" style="margin-top:6px;width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:4px;padding:5px;font-size:10px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">&#8635; Check Stats</button>
    </div>
    <div class="s-section">
      <div class="s-title">Content Pillars</div>
      <div style="font-size:11px;color:var(--hint);line-height:1.7;">
        Pillars are selected randomly on each generation for maximum variety across all 12 topics.
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Tone</div>
      <div class="chip-row" id="tone-chips">
        <div class="chip on" data-tone="cinematic">Cinematic</div>
        <div class="chip" data-tone="emotional">Emotional</div>
        <div class="chip" data-tone="nostalgic">Nostalgic</div>
        <div class="chip" data-tone="inspirational">Inspirational</div>
        <div class="chip" data-tone="dramatic">Dramatic</div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">CTA Style</div>
      <div class="chip-row" id="cta-chips">
        <div class="chip on" data-cta="engagement">Comments</div>
        <div class="chip" data-cta="tag">Tag a friend</div>
        <div class="chip" data-cta="save">Save / share</div>
        <div class="chip" data-cta="follow">Follow</div>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" data-tab="images">Image Posts</div>
      <div class="tab" data-tab="banners">Banners</div>
      <div class="tab" data-tab="shorts">Short Videos (12s)</div>
      <div class="tab" data-tab="longs">Long Videos (60s)</div>
      <div class="tab" data-tab="schedule">Schedule</div>
    </div>

    <!-- IMAGE POSTS -->
    <div class="pane on" id="pane-images">
      <div class="gen-box">
        <p>Generates image posts with cinematic prompts, 3-paragraph captions, hashtags, and first comments. Pillars are randomly selected for variety. <strong style="color:var(--gold);">Tip: Generate 10 at a time for best results.</strong></p>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Pillar Override</label>
          <select id="img-pillar-select" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);outline:none;">
            <option value="">— Random (recommended) —</option>
            <option value="music_videos">Iconic Music Videos</option>
            <option value="albums">Album Deep Dives</option>
            <option value="performances">Live Performances &amp; Tours</option>
            <option value="dance">Dance &amp; Choreography</option>
            <option value="fashion">Fashion Evolution</option>
            <option value="collaborations">Collaborations</option>
            <option value="humanitarian">Humanitarian Work &amp; Legacy</option>
            <option value="rare">Rare &amp; Lesser-Known Moments</option>
            <option value="influence">Influence on Modern Artists</option>
            <option value="fans">Fan Stories &amp; Community</option>
            <option value="records">Record-Breaking Achievements</option>
            <option value="making_of">Making of Specific Songs</option>
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Specific Topic <span style="color:var(--hint);text-transform:none;font-size:10px;">(optional — e.g. "The making of Billie Jean")</span></label>
          <input type="text" id="img-topic-input" placeholder="e.g. MJ's collaboration with Eddie Van Halen..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:13px;color:var(--text);outline:none;">
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-img-btn">Generate Image Posts</button>
          <button class="btn btn-ghost" id="clear-images-btn">Clear</button>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating...</div>
        </div>
      </div>
      <div id="images-container">
        <div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate to create image posts drawn from the 12 content pillars.</p></div>
      </div>
    </div>

    <!-- BANNERS -->
    <div class="pane" id="pane-banners">
      <div class="gen-box">
        <p>Generates typographic banner concepts — vibrant gradient backgrounds with a comment-inviting question. Paste the prompt into OpenArt, Gemini, or any AI image tool.</p>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Pillar Override</label>
          <select id="banner-pillar-select" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);outline:none;">
            <option value="">— Random (recommended) —</option>
            <option value="music_videos">Iconic Music Videos</option>
            <option value="albums">Album Deep Dives</option>
            <option value="performances">Live Performances &amp; Tours</option>
            <option value="dance">Dance &amp; Choreography</option>
            <option value="fashion">Fashion Evolution</option>
            <option value="collaborations">Collaborations</option>
            <option value="humanitarian">Humanitarian Work &amp; Legacy</option>
            <option value="rare">Rare &amp; Lesser-Known Moments</option>
            <option value="influence">Influence on Modern Artists</option>
            <option value="fans">Fan Stories &amp; Community</option>
            <option value="records">Record-Breaking Achievements</option>
            <option value="making_of">Making of Specific Songs</option>
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Specific Topic <span style="color:var(--hint);text-transform:none;font-size:10px;">(optional — e.g. "The making of Billie Jean")</span></label>
          <input type="text" id="banner-topic-input" placeholder="e.g. MJ's collaboration with Eddie Van Halen..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:13px;color:var(--text);outline:none;">
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-banner-btn">Generate 3 Banners</button>
          <button class="btn btn-ghost" id="clear-banners-btn">Clear</button>
        </div>
        <div id="banner-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="banner-prog-fill"></div></div>
          <div class="prog-label" id="banner-prog-label">Generating banners...</div>
        </div>
      </div>
      <div id="banners-container">
        <div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Generate typographic banner concepts with question text and vibrant gradients.</p></div>
      </div>
    </div>

    <!-- SHORT VIDEOS -->
    <div class="pane" id="pane-shorts">
      <div class="gen-box">
        <p>12-second narration scripts for Hypernatural/Seedance. No emojis in script body. Each script includes a scene image prompt for OpenArt.</p>
<div style="margin-bottom:10px;margin-top:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Pillar Override</label>
          <select id="short-pillar-select" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);outline:none;">
            <option value="">— Random (recommended) —</option>
            <option value="music_videos">Iconic Music Videos</option>
            <option value="albums">Album Deep Dives</option>
            <option value="performances">Live Performances &amp; Tours</option>
            <option value="dance">Dance &amp; Choreography</option>
            <option value="fashion">Fashion Evolution</option>
            <option value="collaborations">Collaborations</option>
            <option value="humanitarian">Humanitarian Work &amp; Legacy</option>
            <option value="rare">Rare &amp; Lesser-Known Moments</option>
            <option value="influence">Influence on Modern Artists</option>
            <option value="fans">Fan Stories &amp; Community</option>
            <option value="records">Record-Breaking Achievements</option>
            <option value="making_of">Making of Specific Songs</option>
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Specific Topic <span style="color:var(--hint);text-transform:none;font-size:10px;">(optional)</span></label>
          <input type="text" id="short-topic-input" placeholder="e.g. The moonwalk debut on Motown 25..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:13px;color:var(--text);outline:none;">
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn">Generate 3 Short Scripts</button>
          <button class="btn btn-ghost" id="clear-shorts-btn">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="shorts-container">
        <div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Generate 3 x 12-second narration scripts.</p></div>
      </div>
    </div>

    <!-- LONG VIDEOS -->
    <div class="pane" id="pane-longs">
      <div class="gen-box">
        <p>60-second narration scripts for Hypernatural. No emojis in script body. Each script includes a scene image prompt for OpenArt.</p>
<div style="margin-bottom:10px;margin-top:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Pillar Override</label>
          <select id="long-pillar-select" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);outline:none;">
            <option value="">— Random (recommended) —</option>
            <option value="music_videos">Iconic Music Videos</option>
            <option value="albums">Album Deep Dives</option>
            <option value="performances">Live Performances &amp; Tours</option>
            <option value="dance">Dance &amp; Choreography</option>
            <option value="fashion">Fashion Evolution</option>
            <option value="collaborations">Collaborations</option>
            <option value="humanitarian">Humanitarian Work &amp; Legacy</option>
            <option value="rare">Rare &amp; Lesser-Known Moments</option>
            <option value="influence">Influence on Modern Artists</option>
            <option value="fans">Fan Stories &amp; Community</option>
            <option value="records">Record-Breaking Achievements</option>
            <option value="making_of">Making of Specific Songs</option>
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;">Specific Topic <span style="color:var(--hint);text-transform:none;font-size:10px;">(optional)</span></label>
          <input type="text" id="long-topic-input" placeholder="e.g. The moonwalk debut on Motown 25..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:13px;color:var(--text);outline:none;">
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn">Generate 3 Long Scripts</button>
          <button class="btn btn-ghost" id="clear-longs-btn">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="longs-container">
        <div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Generate 3 x 60-second narration scripts.</p></div>
      </div>
    </div>

    <!-- SCHEDULE -->
    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<!-- Mobile copy modal -->
<div id="copy-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9000;align-items:flex-end;justify-content:center;padding:0;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:16px 16px 0 0;padding:20px;width:100%;max-height:70vh;display:flex;flex-direction:column;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.06em;text-transform:uppercase;" id="copy-modal-title">Copy Text</span>
      <button id="copy-modal-close" style="background:var(--dark3);border:none;color:var(--muted);font-size:18px;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">&#10005;</button>
    </div>
    <textarea id="copy-modal-text" style="flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:8px;padding:12px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);resize:none;min-height:150px;outline:none;line-height:1.7;" readonly></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="copy-modal-btn" class="btn btn-gold" style="flex:1;">Copy to Clipboard</button>
      <button id="copy-modal-close2" class="btn btn-ghost">Done</button>
    </div>
  </div>
</div>

<script>
const PILLAR_MAP = {
    music_videos: "Iconic music videos — breakdowns, cultural impact, and the creative process behind Thriller, Beat It, Billie Jean, Black or White, Smooth Criminal",
    albums: "Album deep dives — Off the Wall, Thriller, Bad, Dangerous, HIStory, Invincible: recording process, collaborators, chart performance",
    performances: "Live performances and concert tours — Victory Tour, Bad Tour, Dangerous Tour, HIStory Tour, This Is It",
    dance: "Dance — the moonwalk debut on Motown 25 (May 16 1983), signature moves, choreography evolution, influence on dancers",
    fashion: "Fashion evolution — documented iconic outfits, the red jacket, military jackets, fedora, single glove, designer collaborations",
    collaborations: "Collaborations with legendary artists — Paul McCartney, Quincy Jones, Siedah Garrett, Eddie Van Halen, and others",
    humanitarian: "Humanitarian work — Heal the World Foundation, We Are the World, documented charity contributions",
    rare: "Rare and lesser-known documented moments — confirmed public appearances, documented interviews, publicly recorded events",
    influence: "Influence on modern artists — documented tributes, confirmed statements about MJ's influence on contemporary music",
    fans: "Fan stories and community — the global fan community, documented fan events, enduring connection with his audience",
    records: "Record-breaking achievements — Billboard chart records, Grammy wins, Thriller as best-selling album, Guinness World Records",
    making_of: "The making of specific songs — documented studio stories, confirmed creative process details, iconic tracks"
  };

const S = {
  bufferToken: localStorage.getItem('mj_buffer') || '',
  profileIds: (localStorage.getItem('mj_profiles') || '').split(',').filter(Boolean),
  geminiKey: localStorage.getItem('mj_gemini') || '',
  tone: 'cinematic', cta: 'engagement',
  imagePosts: [], banners: [], shortVideos: [], longVideos: []
};

// ── PERSISTENCE ───────────────────────────────────────────
function savePosts() {
  try {
    localStorage.setItem('mj_imagePosts', JSON.stringify(S.imagePosts));
    localStorage.setItem('mj_banners', JSON.stringify(S.banners));
    localStorage.setItem('mj_shortVideos', JSON.stringify(S.shortVideos));
    localStorage.setItem('mj_longVideos', JSON.stringify(S.longVideos));
  } catch(e) { console.warn('Save error:', e); }
}
function loadPosts() {
  try {
    const ip = localStorage.getItem('mj_imagePosts');
    const bn = localStorage.getItem('mj_banners');
    const sv = localStorage.getItem('mj_shortVideos');
    const lv = localStorage.getItem('mj_longVideos');
    if (ip) S.imagePosts = JSON.parse(ip);
    if (bn) S.banners = JSON.parse(bn);
    if (sv) S.shortVideos = JSON.parse(sv);
    if (lv) S.longVideos = JSON.parse(lv);
  } catch(e) { console.warn('Load error:', e); }
}

// ── INIT ──────────────────────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('set-buffer').value = S.bufferToken;
  document.getElementById('set-profiles').value = S.profileIds.join(',');
  document.getElementById('set-gemini').value = S.geminiKey;
  document.getElementById('settings-modal').style.display = 'flex';
  refreshStoryStats();
  const h = getTopicHistory();
  const el = document.getElementById('topic-count-display');
  if (el) el.textContent = h.length + ' topics tracked (' + (60 - h.length) + ' slots remaining)';
});
document.getElementById('cancel-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').style.display = 'none';
});
document.getElementById('save-settings-btn').addEventListener('click', () => {
  S.bufferToken = document.getElementById('set-buffer').value.trim();
  S.profileIds = document.getElementById('set-profiles').value.split(',').map(s=>s.trim()).filter(Boolean);
  S.geminiKey = document.getElementById('set-gemini').value.trim();
  localStorage.setItem('mj_buffer', S.bufferToken);
  localStorage.setItem('mj_profiles', S.profileIds.join(','));
  localStorage.setItem('mj_gemini', S.geminiKey);
  document.getElementById('settings-modal').style.display = 'none';
  toast('Settings saved!');
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    tab.classList.add('on');
    document.getElementById('pane-' + tab.dataset.tab).classList.add('on');
  });
});


// Tone/CTA chips
document.getElementById('tone-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#tone-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  S.tone = chip.dataset.tone;
});
document.getElementById('cta-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#cta-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  S.cta = chip.dataset.cta;
});
document.getElementById('gen-img-btn').addEventListener('click', generateImages);
document.getElementById('clear-images-btn').addEventListener('click', () => clearContent('images'));
document.getElementById('gen-banner-btn').addEventListener('click', generateBanners);
document.getElementById('clear-banners-btn').addEventListener('click', () => clearContent('banners'));
document.getElementById('gen-short-btn').addEventListener('click', () => generateVideos('short'));
document.getElementById('clear-shorts-btn').addEventListener('click', () => clearContent('shorts'));
document.getElementById('gen-long-btn').addEventListener('click', () => generateVideos('long'));
document.getElementById('clear-longs-btn').addEventListener('click', () => clearContent('longs'));

// Event delegation
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const type = btn.dataset.type || 'img';
  const idx = parseInt(btn.dataset.idx || '0');
  const field = btn.dataset.field || '';
  if (action === 'upload') document.getElementById('file-' + type + '-' + idx).click();
  if (action === 'regen') genImage(type, idx);
  if (action === 'copy') { const item = getArr(type)[idx]; copyToClipboard(item[field]||''); }
  if (action === 'sectab') {
    const panes = btn.dataset.panes.split(',');
    const show = btn.dataset.show;
    panes.forEach(id => { const p = document.getElementById(id); if(p) p.classList.remove('on'); });
    const sp = document.getElementById(show); if(sp) sp.classList.add('on');
    btn.closest('.sec-tabs').querySelectorAll('.sec-tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
  }
});
document.addEventListener('change', e => {
  const input = e.target;
  if (input.dataset.fileType) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => applyImage(input.dataset.fileType, parseInt(input.dataset.fileIdx), ev.target.result);
    r.readAsDataURL(f);
  }
});
document.addEventListener('dragover', e => { if (e.target.closest('.drop-zone')) e.preventDefault(); });
document.addEventListener('dragleave', e => { const dz = e.target.closest('.drop-zone'); if(dz) dz.classList.remove('over'); });
document.addEventListener('dragenter', e => { const dz = e.target.closest('.drop-zone'); if(dz) dz.classList.add('over'); });
document.addEventListener('drop', e => {
  const dz = e.target.closest('[data-drop-type]');
  if (!dz) return;
  e.preventDefault(); dz.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (!f || !f.type.startsWith('image/')) { toast('Drop an image file'); return; }
  const r = new FileReader();
  r.onload = ev => applyImage(dz.dataset.dropType, parseInt(dz.dataset.dropIdx), ev.target.result);
  r.readAsDataURL(f);
});

// ── HELPERS ───────────────────────────────────────────────
function copyToClipboard(text, title) {
  // On mobile, show a modal with the text for easy selection/copy
  if (window.innerWidth <= 680) {
    showCopyModal(text, title || 'Copy Text');
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Copied!'); }
  catch(e) { showCopyModal(text, 'Copy Text'); }
  document.body.removeChild(ta);
}

function showCopyModal(text, title) {
  document.getElementById('copy-modal-title').textContent = title || 'Copy Text';
  document.getElementById('copy-modal-text').value = text;
  document.getElementById('copy-modal').style.display = 'flex';
  setTimeout(() => {
    const ta = document.getElementById('copy-modal-text');
    ta.focus(); ta.select();
    ta.setSelectionRange(0, 99999);
  }, 100);
}

function closeCopyModal() {
  document.getElementById('copy-modal').style.display = 'none';
}


function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Copied!'); }
  catch(e) { toast('Copy failed — long press text to copy', true); }
  document.body.removeChild(ta);
}
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#3A1010' : 'var(--dark2)';
  t.style.borderColor = isError ? '#AA3D3D' : 'var(--border)';
  t.style.color = isError ? '#D48A8A' : 'var(--gold-light)';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), isError ? 12000 : 3500);
}
function setP(fId, lId, pct, label) {
  const f = document.getElementById(fId); if(f) f.style.width = pct + '%';
  const l = document.getElementById(lId); if(l) l.textContent = label;
}
function updateStats() {
  document.getElementById('s-images').textContent = S.imagePosts.length;
  document.getElementById('s-banners').textContent = S.banners.length;
  document.getElementById('s-videos').textContent = S.shortVideos.length + S.longVideos.length;
  document.getElementById('s-sched').textContent = [...S.imagePosts,...S.banners,...S.shortVideos,...S.longVideos].filter(p=>p.scheduled).length;
}
function parseTime(s) {
  const m = s.trim().toUpperCase().match(/([0-9]+):([0-9]+)[ ]*(AM|PM)?/);
  if (!m) return {h:8,m:0};
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3]==='PM'&&h<12) h+=12;
  if (m[3]==='AM'&&h===12) h=0;
  return {h, m:min};
}
function addMins(t, mins) { const total = t.h*60+t.m+mins; return {h:Math.floor(total/60)%24, m:total%60}; }
function fmtTime(t) { const h=t.h%12||12, ap=t.h<12?'AM':'PM'; return h+':'+String(t.m).padStart(2,'0')+' '+ap; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getArr(type) {
  return type==='img'?S.imagePosts:type==='banner'?S.banners:type==='short'?S.shortVideos:S.longVideos;
}

// ── GENERATE IMAGE POSTS ──────────────────────────────────

function getOverride(paneId) {
  const pillarVal = document.getElementById(paneId + '-pillar-select');
  const topicVal = document.getElementById(paneId + '-topic-input');
  const pillar = pillarVal ? pillarVal.value : '';
  const topic = topicVal ? topicVal.value.trim() : '';
  
  let override = '';
  if (pillar && PILLAR_MAP[pillar]) {
    override = PILLAR_MAP[pillar];
  }
  if (topic) {
    override = override ? override + ' — specifically: ' + topic : topic;
  }
  return override;
}

async function generateImages() {
  const count = parseInt(document.getElementById('post-count').value);
  const override = getOverride('img');
  const btn = document.getElementById('gen-img-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('img-prog-wrap').style.display = 'block';
  setP('img-prog-fill','img-prog-label',15,'Selecting pillars and generating posts...');
  try {
    const res = await fetch('/mj/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({count, themeOverride: override, tone: S.tone, cta: S.cta, exclusions: getExclusions()})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('img-prog-fill','img-prog-label',100,'Posts ready!');
    S.imagePosts = data.posts.map((p,i) => ({id:i, type:'image', ...p, imgUrl:null, scheduled:false}));
    addTopicsToHistory(data.posts);
    savePosts();
    setTimeout(() => {
      document.getElementById('img-prog-wrap').style.display = 'none';
      renderImagePosts(); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('img-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate Image Posts';
}

// ── GENERATE BANNERS ──────────────────────────────────────
async function generateBanners() {
  const override = getOverride('banner');
  const btn = document.getElementById('gen-banner-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('banner-prog-wrap').style.display = 'block';
  setP('banner-prog-fill','banner-prog-label',15,'Creating banner concepts...');
  try {
    const res = await fetch('/mj/api/generate-banner', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({count:3, themeOverride:override})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('banner-prog-fill','banner-prog-label',100,'Banners ready!');
    S.banners = data.banners.map((b,i) => ({id:i, type:'banner', ...b, imgUrl:null, scheduled:false}));
    addTopicsToHistory(data.banners);
    savePosts();
    setTimeout(() => {
      document.getElementById('banner-prog-wrap').style.display = 'none';
      renderBanners(); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('banner-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 Banners';
}

// ── GENERATE VIDEOS ───────────────────────────────────────
async function generateVideos(type) {
  const btn = document.getElementById('gen-'+type+'-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById(type+'-prog-wrap').style.display = 'block';
  setP(type+'-prog-fill', type+'-prog-label', 15, 'Writing scripts...');
  try {
    const res = await fetch('/mj/api/generate-video', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({videoType:type, count:3, themeOverride: getOverride(type), exclusions: getExclusions()})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP(type+'-prog-fill', type+'-prog-label', 100, 'Scripts ready!');
    const arr = data.videos.map((v,i) => ({id:i, type, ...v, imgUrl:null, scheduled:false}));
    if (type==='short') S.shortVideos = arr; else S.longVideos = arr;
    addTopicsToHistory(data.videos);
    savePosts();
    setTimeout(() => {
      document.getElementById(type+'-prog-wrap').style.display = 'none';
      renderVideos(type); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById(type+'-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 '+(type==='short'?'Short':'Long')+' Scripts';
}

// ── CARD BUILDER ──────────────────────────────────────────
function buildCard(type, idx, item, time, typeLabel, typeCls, s1text, s2text, s3text, tab1label, tab2label) {
  const dotCls = item.imgUrl ? (item.scheduled?'dot-s':'dot-r') : 'dot-p';
  const statusTxt = item.scheduled ? 'Scheduled' : item.imgUrl ? 'Image ready' : type==='banner' ? 'Paste prompt into image tool' : 'Upload or generate image';
  const pane1id = type+'-s1-'+idx;
  const pane2id = type+'-s2-'+idx;
  const allPanes = pane1id+','+pane2id;

  let imgColHTML;
  if (type === 'banner') {
    imgColHTML = item.imgUrl
      ? '<img src="'+esc(item.imgUrl)+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">'
      : '<div class="banner-placeholder"><span style="font-size:20px">&#127775;</span><span>Generate in<br>OpenArt or<br>Gemini</span></div>';
  } else {
    imgColHTML = item.imgUrl
      ? '<img src="'+esc(item.imgUrl)+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">'
      : '<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'" data-action="upload" data-type="'+type+'" data-idx="'+idx+'"><span class="dz-icon">&#9727;</span><span>Generate or drop</span></div>';
  }

  const copyBtnField1 = type==='img'?'imagePrompt':type==='banner'?'bannerPrompt':'videoScript';
  const copyBtn1Label = type==='img'?'Prompt':type==='banner'?'Banner Prompt':'Script';
  const schedDisabled = (type==='banner' && !item.imgUrl) || (type!=='banner' && !item.imgUrl) ? ' disabled' : '';

  return '<div class="card-head">'
    +'<span class="card-num">#'+String(idx+1).padStart(2,'0')+'</span>'
    +(item.pillar ? '<span class="card-pillar">'+esc(item.pillar)+'</span>' : '')
    +'<span class="card-type '+typeCls+'">'+typeLabel+'</span>'
    +'<span class="card-time">'+time+'</span>'
    +'</div>'
    +'<div class="card-body">'
    +'<div class="card-text">'
    +'<div class="sec-tabs">'
    +'<div class="sec-tab on" data-action="sectab" data-panes="'+allPanes+'" data-show="'+pane1id+'">'+tab1label+'</div>'
    +'<div class="sec-tab" data-action="sectab" data-panes="'+allPanes+'" data-show="'+pane2id+'">'+tab2label+'</div>'
    +'</div>'
    +'<div class="sec-pane on" id="'+pane1id+'"><div class="section-text'+(type==='img'?' prompt':'')+'">'+esc(s1text||'')+'</div></div>'
    +'<div class="sec-pane" id="'+pane2id+'"><div class="section-text">'+esc(s2text||'')+'</div></div>'
    +'<div class="first-comment-block"><div class="first-comment-label">First Comment</div><div class="first-comment-text">'+esc(s3text||'')+'</div></div>'
    +'</div>'
    +'<div class="card-img-col">'
    +'<input type="file" id="file-'+type+'-'+idx+'" accept="image/*" data-file-type="'+type+'" data-file-idx="'+idx+'" style="display:none">'
    +'<div id="img-'+type+'-'+idx+'">'+imgColHTML+'</div>'
    +(type!=='banner' ? '<button class="mbtn" data-action="regen" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8635; Regen</button>' : '<button class="mbtn" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8679; Upload</button>')
    +'</div>'
    +'</div>'
    +'<div class="card-foot">'
    +'<div class="s-dot '+dotCls+'" id="dot-'+type+'-'+idx+'"></div>'
    +'<span class="s-txt" id="stxt-'+type+'-'+idx+'">'+statusTxt+'</span>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="'+copyBtnField1+'">'+copyBtn1Label+'</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="'+(type==='img'||type==='banner'?'caption':'captionAndHashtags')+'">Caption</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="firstComment">Comment</button>'
    +'</div>';
}

// Fix caption field name for image posts
function buildCardHTML(type, idx, item, time, typeLabel, typeCls) {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  if (type === 'img') {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.imagePrompt, item.caption, item.firstComment, 'Image Prompt', 'Caption & Hashtags');
  } else if (type === 'banner') {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.bannerPrompt, item.caption, item.firstComment, 'Banner Prompt', 'Caption & Hashtags');
  } else {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.videoScript, item.captionAndHashtags, item.firstComment, 'Video Script', 'Caption & Hashtags');
  }
}

// ── RENDER FUNCTIONS ──────────────────────────────────────
function renderImagePosts() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const container = document.getElementById('images-container');
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  S.imagePosts.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'img-card-'+i;
    card.innerHTML = buildCardHTML('img', i, p, fmtTime(addMins(start, i*intv)), 'IMAGE', 'type-image');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderBanners() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = S.imagePosts.length;
  const container = document.getElementById('banners-container');
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  S.banners.forEach((b, i) => {
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'banner-card-'+i;
    card.innerHTML = buildCardHTML('banner', i, b, fmtTime(addMins(start, (baseOff+i)*intv)), 'BANNER', 'type-banner');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderVideos(type) {
  const arr = type==='short' ? S.shortVideos : S.longVideos;
  const container = document.getElementById(type==='short'?'shorts-container':'longs-container');
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = S.imagePosts.length + S.banners.length + (type==='long' ? 3 : 0);
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  arr.forEach((v, i) => {
    const typeCls = type==='short'?'type-short':'type-long';
    const typeLabel = type==='short'?'SHORT 12s':'LONG 60s';
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = type+'-card-'+i;
    card.innerHTML = buildCardHTML(type, i, v, fmtTime(addMins(start, (baseOff+i)*intv)), typeLabel, typeCls);
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ── IMAGE UPLOAD & GENERATION ─────────────────────────────
function applyImage(type, idx, dataUrl) {
  const arr = getArr(type);
  arr[idx].imgUrl = dataUrl;
  const imgDiv = document.getElementById('img-'+type+'-'+idx);
  if (imgDiv) imgDiv.innerHTML = '<img src="'+dataUrl+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">';
  const dot = document.getElementById('dot-'+type+'-'+idx); if(dot) dot.className = 's-dot dot-r';
  const stxt = document.getElementById('stxt-'+type+'-'+idx); if(stxt) stxt.textContent = 'Image ready';
  savePosts(); updateStats(); renderSchedule();
  toast('Image set for #'+(idx+1));
}

async function genImage(type, idx) {
  const arr = getArr(type);
  const promptField = type==='img' ? 'imagePrompt' : type==='banner' ? 'bannerPrompt' : 'imagePrompt';
  const prompt = arr[idx][promptField];
  const imgDiv = document.getElementById('img-'+type+'-'+idx);
  const dot = document.getElementById('dot-'+type+'-'+idx);
  const stxt = document.getElementById('stxt-'+type+'-'+idx);
  if(dot) dot.className = 's-dot dot-p';
  if(stxt) stxt.textContent = 'Generating...';
  if(imgDiv) imgDiv.innerHTML = '<div class="img-gen"><div class="spinner"></div><span>Generating...</span></div>';
  try {
    const res = await fetch('/mj/api/image', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, geminiKey: S.geminiKey})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    applyImage(type, idx, data.dataUrl);
  } catch(e) {
    if(imgDiv) imgDiv.innerHTML = '<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    if(dot) dot.className = 's-dot';
    if(stxt) stxt.textContent = 'Error: '+e.message.substring(0,60);
    toast('Error: '+e.message, true);
  }
}

// ── CLEAR CONTENT ─────────────────────────────────────────
function clearContent(type) {
  if (type==='images') {
    S.imagePosts = []; localStorage.removeItem('mj_imagePosts');
    document.getElementById('images-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate.</p></div>';
  } else if (type==='banners') {
    S.banners = []; localStorage.removeItem('mj_banners');
    document.getElementById('banners-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Click Generate.</p></div>';
  } else if (type==='shorts') {
    S.shortVideos = []; localStorage.removeItem('mj_shortVideos');
    document.getElementById('shorts-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';
  } else {
    S.longVideos = []; localStorage.removeItem('mj_longVideos');
    document.getElementById('longs-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate.</p></div>';
  }
  updateStats();
}

// ── SCHEDULE VIEW ─────────────────────────────────────────
function renderSchedule() {
  const all = [
    ...S.imagePosts.map((p,i) => ({...p, dType:'Image', tKey:'img', cap:p.caption})),
    ...S.banners.map((b,i) => ({...b, dType:'Banner', tKey:'banner', cap:b.caption})),
    ...S.shortVideos.map((v,i) => ({...v, dType:'Short', tKey:'short', cap:v.captionAndHashtags})),
    ...S.longVideos.map((v,i) => ({...v, dType:'Long', tKey:'long', cap:v.captionAndHashtags}))
  ];
  if (!all.length) return;
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const rows = all.map((item, i) => {
    const t = fmtTime(addMins(start, i*intv));
    const pill = item.scheduled ? '<span class="pill pill-s">Scheduled</span>' : item.imgUrl ? '<span class="pill pill-r">Ready</span>' : '<span class="pill pill-p">Pending</span>';
    const tLabel = item.dType==='Image' ? '<span class="card-type type-image">IMG</span>'
      : item.dType==='Banner' ? '<span class="card-type type-banner">BNR</span>'
      : item.dType==='Short' ? '<span class="card-type type-short">SHORT</span>'
      : '<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">'+(i+1)+'</span>'+tLabel+'<span style="font-size:11px">'+esc((item.cap||'').substring(0,45))+'...</span><span style="font-size:11px;color:var(--muted)">'+t+'</span>'+pill+'</div>';
  }).join('');
  document.getElementById('sched-container').innerHTML = '<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Caption</span><span>Time</span><span>Status</span></div>'+rows+'</div>';
}


// ── MOBILE MENU ───────────────────────────────────────────
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  sidebar.classList.toggle('open');
  btn.classList.toggle('on');
});
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (window.innerWidth <= 680) {
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('mobile-menu-btn').classList.remove('on');
    }
  });
});


// ── COPY MODAL ────────────────────────────────────────────
document.getElementById('copy-modal-close').addEventListener('click', closeCopyModal);
document.getElementById('copy-modal-close2').addEventListener('click', closeCopyModal);
document.getElementById('copy-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('copy-modal')) closeCopyModal();
});
document.getElementById('copy-modal-btn').addEventListener('click', () => {
  const text = document.getElementById('copy-modal-text').value;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => { toast('Copied!'); closeCopyModal(); }).catch(() => toast('Select all text above and copy manually'));
  } else {
    const ta = document.getElementById('copy-modal-text');
    ta.select(); ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); toast('Copied!'); closeCopyModal(); }
    catch(e) { toast('Select all text above and copy manually'); }
  }
});


// ── TOPIC TRACKER ─────────────────────────────────────────
const TOPIC_HISTORY_KEY = 'mj_topic_history'; // shared across all content types
const MAX_HISTORY = 60;

function getTopicHistory() {
  try { return JSON.parse(localStorage.getItem(TOPIC_HISTORY_KEY) || '[]'); }
  catch(e) { return []; }
}
function addTopicsToHistory(posts) {
  if (!posts || !posts.length) return;
  const history = getTopicHistory();
  posts.forEach(p => {
    const topics = (p.topics_used || p.pillar || '').split(',').map(t => t.trim()).filter(Boolean);
    topics.forEach(t => { if (t && !history.includes(t)) history.unshift(t); });
  });
  localStorage.setItem(TOPIC_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}
function clearTopicHistory() {
  localStorage.removeItem(TOPIC_HISTORY_KEY);
  toast('Topic history cleared!');
}
function getExclusions() {
  return getTopicHistory().slice(0, 40);
}


// ── STORY DATABASE ─────────────────────────────────────────
async function refreshStoryStats() {
  const el = document.getElementById('story-counter');
  const settingsEl = document.getElementById('settings-story-stats');
  try {
    const res = await fetch('/mj/api/story-stats');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    
    const pct = Math.round((data.used / data.total) * 100);
    const counterHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;">
        <div style="background:var(--dark3);border-radius:4px;padding:6px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--gold);font-family:Bebas Neue,sans-serif;">${data.total}</div>
          <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.08em;">Total</div>
        </div>
        <div style="background:var(--dark3);border-radius:4px;padding:6px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:${data.unused < 50 ? '#D48A8A' : '#1D9E75'};font-family:Bebas Neue,sans-serif;">${data.unused}</div>
          <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.08em;">Unused</div>
        </div>
      </div>
      <div style="height:4px;background:var(--dark3);border-radius:99px;overflow:hidden;margin-bottom:4px;">
        <div style="height:100%;width:${pct}%;background:${pct > 75 ? '#AA3D3D' : pct > 50 ? '#C9A84C' : '#1D9E75'};border-radius:99px;transition:width .4s;"></div>
      </div>
      <div style="font-size:10px;color:var(--hint);">${pct}% used · ~${data.days_remaining} days remaining</div>
    `;
    if (el) el.innerHTML = counterHTML;
    if (settingsEl) settingsEl.innerHTML = `${data.total} stories total · ${data.used} used · ${data.unused} remaining · ~${data.days_remaining} days at 15 posts/day`;
  } catch(e) {
    if (el) el.innerHTML = '<span style="color:var(--hint)">Stats unavailable</span>';
  }
}

async function runStoryRefresh() {
  const btn = document.getElementById('refresh-stories-btn');
  const status = document.getElementById('refresh-status');
  if (!btn || !status) return;
  
  btn.disabled = true;
  btn.textContent = 'Generating 400 new stories... (takes ~2 minutes)';
  status.style.display = 'block';
  status.textContent = 'Calling Claude API to generate new story angles...';
  status.style.color = 'var(--gold)';
  
  try {
    const res = await fetch('/mj/api/refresh-stories', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    
    status.textContent = data.message;
    status.style.color = '#1D9E75';
    btn.textContent = '✓ ' + data.total_count + ' stories now available';
    refreshStoryStats();
    toast(data.message);
  } catch(e) {
    status.textContent = 'Error: ' + e.message;
    status.style.color = '#D48A8A';
    btn.disabled = false;
    btn.textContent = '↻ Generate 400 New Story Angles';
  }
}

// Load stats on page init
setTimeout(refreshStoryStats, 1000);

// ── LOAD SAVED POSTS ON INIT ──────────────────────────────
loadPosts();
if (S.imagePosts.length) { renderImagePosts(); updateStats(); renderSchedule(); }
if (S.banners.length) { renderBanners(); updateStats(); renderSchedule(); }
if (S.shortVideos.length) renderVideos('short');
if (S.longVideos.length) renderVideos('long');
updateStats();
</script>
</body>
</html>
'''
