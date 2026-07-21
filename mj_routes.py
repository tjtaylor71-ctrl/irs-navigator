import os, json, base64, requests, random
from flask import Blueprint, request, jsonify, Response

mj_bp = Blueprint('mj', __name__, url_prefix='/mj')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

# Story database system
# Stories persist in Railway volume at /data/mj_stories.json
# Falls back to embedded 484 stories if volume not available

import random as _random_mj, os as _os, json as _json

VOLUME_PATH = '/app/data'
STORIES_FILE = os.path.join(VOLUME_PATH, 'mj_stories.json')
USED_FILE = os.path.join(VOLUME_PATH, 'mj_used_stories.json')

# Embedded baseline stories (484 angles) - used when volume file doesn't exist
EMBEDDED_STORIES = [{"id": "song_histories_000", "category": "song_histories", "angle": "The writing and recording of Billie Jean, written entirely by MJ, and its seven-week run at number one on the Billboard Hot 100 in 1983"}, {"id": "song_histories_001", "category": "song_histories", "angle": "Beat It featuring Eddie Van Halen's guitar solo, recorded as a favor with no payment, and the song winning the Grammy for Record of the Year in 1984"}, {"id": "song_histories_002", "category": "song_histories", "angle": "The making of the Thriller short film directed by John Landis, its 13-minute runtime, and its preservation in the Library of Congress National Film Registry"}, {"id": "song_histories_003", "category": "song_histories", "angle": "Rock With You written by Rod Temperton for Off The Wall, reaching number one on the Billboard Hot 100 in early 1980"}, {"id": "song_histories_004", "category": "song_histories", "angle": "Don't Stop 'Til You Get Enough, written by MJ, becoming his first number one as an adult solo artist in 1979"}, {"id": "song_histories_005", "category": "song_histories", "angle": "Human Nature, written by Steve Porcaro of Toto, becoming a top 10 hit from Thriller in 1983"}, {"id": "song_histories_006", "category": "song_histories", "angle": "P.Y.T. (Pretty Young Thing) co-written by James Ingram and Quincy Jones for the Thriller album"}, {"id": "song_histories_007", "category": "song_histories", "angle": "The Girl Is Mine, MJ's duet with Paul McCartney, released as the first single from Thriller in 1982"}, {"id": "song_histories_008", "category": "song_histories", "angle": "Wanna Be Startin' Somethin', the opening track of Thriller, and its later use of Cameroonian artist Manu Dibango's chant which led to a settlement"}, {"id": "song_histories_009", "category": "song_histories", "angle": "Man in the Mirror, written by Siedah Garrett and Glen Ballard, becoming MJ's eleventh number one hit in 1988"}, {"id": "song_histories_010", "category": "song_histories", "angle": "The Way You Make Me Feel reaching number one on the Billboard Hot 100 in early 1988 from the Bad album"}, {"id": "song_histories_011", "category": "song_histories", "angle": "Bad, the title track written by MJ, and its music video directed by Martin Scorsese"}, {"id": "song_histories_012", "category": "song_histories", "angle": "Smooth Criminal and its famous anti-gravity lean, achieved using special shoes with a slot that locked onto pegs in the stage floor"}, {"id": "song_histories_013", "category": "song_histories", "angle": "Dirty Diana reaching number one in 1988, becoming the fifth consecutive number one single from Bad"}, {"id": "song_histories_014", "category": "song_histories", "angle": "Black or White featuring Slash on guitar, debuting at number one on the Billboard Hot 100 in 1991"}, {"id": "song_histories_015", "category": "song_histories", "angle": "Remember the Time from Dangerous, with its music video set in ancient Egypt featuring Eddie Murphy and Magic Johnson"}, {"id": "song_histories_016", "category": "song_histories", "angle": "In The Closet from Dangerous, featuring an uncredited vocal from Princess Stephanie of Monaco"}, {"id": "song_histories_017", "category": "song_histories", "angle": "Heal the World, written by MJ, released as a single in 1992 and becoming an anthem for his foundation of the same name"}, {"id": "song_histories_018", "category": "song_histories", "angle": "Jam from Dangerous, featuring a guest rap verse from Heavy D"}, {"id": "song_histories_019", "category": "song_histories", "angle": "Will You Be There, used as the theme for the film Free Willy, reaching number two on the Hot 100 in 1993"}, {"id": "song_histories_020", "category": "song_histories", "angle": "Earth Song reaching number one in the UK for six weeks in late 1995, MJ's biggest UK chart hit"}, {"id": "song_histories_021", "category": "song_histories", "angle": "You Are Not Alone, written by R Kelly, becoming the first song in history to debut at number one on the Billboard Hot 100"}, {"id": "song_histories_022", "category": "song_histories", "angle": "Scream, a duet with sister Janet Jackson, with its music video being the most expensive ever made at the time"}, {"id": "song_histories_023", "category": "song_histories", "angle": "They Don't Care About Us and its two music videos directed by Spike Lee, one filmed in Brazil and one in a prison"}, {"id": "song_histories_024", "category": "song_histories", "angle": "Stranger in Moscow, written during the Dangerous World Tour, with a music video shot in black and white in Los Angeles"}, {"id": "song_histories_025", "category": "song_histories", "angle": "Blood on the Dance Floor, the title track of the 1997 remix album which became the best-selling remix album of all time"}, {"id": "song_histories_026", "category": "song_histories", "angle": "You Rock My World from Invincible, with its short film co-starring Chris Tucker and Marlon Brando"}, {"id": "song_histories_027", "category": "song_histories", "angle": "Got To Be There, MJ's first single as a solo artist, released in 1971 when he was 13"}, {"id": "song_histories_028", "category": "song_histories", "angle": "Ben, the title song from the 1972 film, becoming MJ's first number one solo hit in the US"}, {"id": "song_histories_029", "category": "song_histories", "angle": "ABC by the Jackson 5 reaching number one on the Billboard Hot 100 in 1970, the group's second consecutive number one"}, {"id": "song_histories_030", "category": "song_histories", "angle": "I Want You Back, the Jackson 5's debut single, reaching number one in January 1970"}, {"id": "song_histories_031", "category": "song_histories", "angle": "I'll Be There by the Jackson 5 becoming Motown's best-selling single up to that point in 1970"}, {"id": "song_histories_032", "category": "song_histories", "angle": "Rockin' Robin, MJ's solo cover released in 1972, reaching number two on the Billboard Hot 100"}, {"id": "song_histories_033", "category": "song_histories", "angle": "Off The Wall, the title track written by Rod Temperton, becoming a top 10 hit in 1980"}, {"id": "song_histories_034", "category": "song_histories", "angle": "She's Out of My Life, a ballad MJ recorded for Off The Wall, with reports that he cried during the vocal take"}, {"id": "song_histories_035", "category": "song_histories", "angle": "Thriller album credits showing Quincy Jones as producer and Bruce Swedien as recording engineer across all tracks"}, {"id": "song_histories_036", "category": "song_histories", "angle": "The 1995 HIStory album being released as a double album, pairing greatest hits with new material"}, {"id": "song_histories_037", "category": "song_histories", "angle": "Dangerous, the title track, co-written and co-produced by Teddy Riley introducing the New Jack Swing sound to MJ's music"}, {"id": "song_histories_038", "category": "song_histories", "angle": "Who Is It from Dangerous, with an a cappella version highlighting MJ's vocal layering technique"}, {"id": "song_histories_039", "category": "song_histories", "angle": "Childhood, written for the Free Willy 2 soundtrack and later used in the This Is It rehearsal footage"}, {"id": "song_histories_040", "category": "song_histories", "angle": "Privacy from Invincible, addressing media intrusion, co-written by MJ and Dr Freeze"}, {"id": "song_histories_041", "category": "song_histories", "angle": "Cry from Invincible, featuring a music video showing thousands of people from around the world"}, {"id": "song_histories_042", "category": "song_histories", "angle": "Butterflies from Invincible, written by Floetry's Marsha Ambrosius and Andre Harris"}, {"id": "song_histories_043", "category": "song_histories", "angle": "2 Bad from HIStory, featuring a rap verse from Shaquille O'Neal"}, {"id": "song_histories_044", "category": "song_histories", "angle": "This Time Around from HIStory, featuring The Notorious B.I.G."}, {"id": "song_histories_045", "category": "song_histories", "angle": "Tabloid Junkie from HIStory, addressing MJ's relationship with the media"}, {"id": "song_histories_046", "category": "song_histories", "angle": "D.S. from HIStory, a track widely interpreted as a response to the 1993 allegations against MJ"}, {"id": "song_histories_047", "category": "song_histories", "angle": "Money from HIStory, addressing themes of greed and betrayal"}, {"id": "song_histories_048", "category": "song_histories", "angle": "Morphine from the HIStory album (1995), an experimental rock-influenced track that also appeared on the Blood on the Dance Floor remix album in 1997"}, {"id": "song_histories_049", "category": "song_histories", "angle": "Speed Demon from Bad, with an accompanying claymation short film"}, {"id": "song_histories_050", "category": "song_histories", "angle": "Liberian Girl from Bad, with a music video featuring numerous celebrity cameos"}, {"id": "song_histories_051", "category": "song_histories", "angle": "Just Good Friends, a duet with Stevie Wonder from the Bad album"}, {"id": "song_histories_052", "category": "song_histories", "angle": "Heaven Can Wait from Invincible, co-written with Carole Bayer Sager"}, {"id": "song_histories_053", "category": "song_histories", "angle": "Whatever Happens from Invincible, featuring guitar by Carlos Santana"}, {"id": "song_histories_054", "category": "song_histories", "angle": "The Lost Children from Invincible, dedicated to children around the world"}, {"id": "song_histories_055", "category": "song_histories", "angle": "Threatened from Invincible, with a spoken word sample from Rod Serling's Twilight Zone narration"}, {"id": "song_histories_056", "category": "song_histories", "angle": "Unbreakable from Invincible, featuring a guest verse from The Notorious B.I.G."}, {"id": "song_histories_057", "category": "song_histories", "angle": "Heartbreaker from Invincible, featuring a guest verse from Fats"}, {"id": "song_histories_058", "category": "song_histories", "angle": "We've Had Enough from Invincible, addressing themes of war"}, {"id": "song_histories_059", "category": "song_histories", "angle": "2 Bad from the HIStory album featuring a guest rap verse from NBA star Shaquille O'Neal, an unusual sports-music crossover for 1995"}, {"id": "song_histories_060", "category": "song_histories", "angle": "Why You Wanna Trip on Me from Dangerous, addressing social issues including AIDS and homelessness"}, {"id": "song_histories_061", "category": "song_histories", "angle": "Keep the Faith from Dangerous, co-written with Glen Ballard and Siedah Garrett"}, {"id": "song_histories_062", "category": "song_histories", "angle": "Gone Too Soon from Dangerous, a ballad dedicated to Ryan White's memory"}, {"id": "song_histories_063", "category": "song_histories", "angle": "Give In To Me from Dangerous, featuring a guitar solo from Slash, reaching number two in the UK"}, {"id": "song_histories_064", "category": "song_histories", "angle": "Can't Let Her Get Away from Dangerous, produced by Teddy Riley"}, {"id": "song_histories_065", "category": "song_histories", "angle": "She Drives Me Wild from Dangerous, featuring car horn and engine sound samples"}, {"id": "song_histories_066", "category": "song_histories", "angle": "Heaven Can Wait, one of multiple tracks on Invincible co-produced with Babyface"}, {"id": "song_histories_067", "category": "song_histories", "angle": "The Beatles catalog purchase in 1985, giving MJ ownership of the publishing rights to most Beatles songs"}, {"id": "song_histories_068", "category": "song_histories", "angle": "Say Say Say, MJ's second collaboration with Paul McCartney, reaching number one in 1983"}, {"id": "song_histories_069", "category": "song_histories", "angle": "The album credits of Bad listing MJ as sole producer alongside Quincy Jones for the first time"}, {"id": "song_histories_070", "category": "song_histories", "angle": "Smooth Criminal's chart performance reaching number seven on the Billboard Hot 100 in 1988"}, {"id": "song_histories_071", "category": "song_histories", "angle": "The HIStory Tour setlist featuring a medley of Jackson 5 hits performed with his brothers in some shows"}, {"id": "song_histories_072", "category": "song_histories", "angle": "Bad's title track music video, a 17-minute short film directed by Martin Scorsese set in a subway station"}, {"id": "song_histories_073", "category": "song_histories", "angle": "The Thriller album's engineering by Bruce Swedien, who used a custom-built drum sound for Billie Jean"}, {"id": "song_histories_074", "category": "song_histories", "angle": "Off The Wall becoming the first album to generate four top 10 hits in the United States by a solo artist"}, {"id": "song_histories_075", "category": "song_histories", "angle": "Rock With You's music video featuring MJ in a sparkling silver and black outfit against a starfield background"}, {"id": "song_histories_076", "category": "song_histories", "angle": "The recording of Bad taking place primarily at Westlake Recording Studios in Los Angeles"}, {"id": "song_histories_077", "category": "song_histories", "angle": "HIStory's lead single Scream debuting at number five on the Billboard Hot 100 in 1995"}, {"id": "song_histories_078", "category": "song_histories", "angle": "You Are Not Alone winning the Grammy for Best R&B Vocal Performance in 1996"}, {"id": "song_histories_079", "category": "song_histories", "angle": "Black or White's 11-minute music video including a controversial ending segment that was edited after broadcast"}, {"id": "song_histories_080", "category": "song_histories", "angle": "The 1995 MTV Video Music Awards performance of Scream/You Are Not Alone medley with Janet Jackson"}, {"id": "song_histories_081", "category": "song_histories", "angle": "Billie Jean's music video being one of the first by a Black artist played in heavy rotation on MTV"}, {"id": "song_histories_082", "category": "song_histories", "angle": "The credits for We Are the World listing MJ and Lionel Richie as co-writers and Quincy Jones as producer"}, {"id": "song_histories_083", "category": "song_histories", "angle": "Don't Stop 'Til You Get Enough winning MJ his first Grammy for Best Male R&B Vocal Performance in 1980"}, {"id": "song_histories_084", "category": "song_histories", "angle": "The 25th anniversary edition of Thriller released in 2008 featuring new remixes with contemporary artists"}, {"id": "song_histories_085", "category": "song_histories", "angle": "Will You Be There's spoken word introduction quoting Psalm 27"}, {"id": "song_histories_086", "category": "song_histories", "angle": "The album Invincible taking over $30 million to produce, making it one of the most expensive albums ever recorded"}, {"id": "family_history_000", "category": "family_history", "angle": "The Jackson family's origins in Gary Indiana, where MJ was born on August 29 1958 in a small house on Jackson Street"}, {"id": "family_history_001", "category": "family_history", "angle": "Joe Jackson forming the Jackson Brothers band in the early 1960s with his sons Jackie, Tito and Jermaine"}, {"id": "family_history_002", "category": "family_history", "angle": "Michael joining his brothers' group at age five, initially playing congas before becoming a lead singer"}, {"id": "family_history_003", "category": "family_history", "angle": "The Jackson 5 winning amateur talent contests at the Apollo Theater in Harlem in the late 1960s"}, {"id": "family_history_004", "category": "family_history", "angle": "Motown Records founder Berry Gordy signing the Jackson 5 in 1968 after seeing them perform"}, {"id": "family_history_005", "category": "family_history", "angle": "The Jackson family relocating from Gary Indiana to Los Angeles in 1969 following the Motown signing"}, {"id": "family_history_006", "category": "family_history", "angle": "Diana Ross introducing the Jackson 5 to the public, with early publicity crediting her as their discoverer"}, {"id": "family_history_007", "category": "family_history", "angle": "The Jackson 5's first four singles on Motown all reaching number one on the Billboard Hot 100 in 1969 and 1970"}, {"id": "family_history_008", "category": "family_history", "angle": "Joe Jackson's background as a steelworker in Gary Indiana before managing his sons' music career"}, {"id": "family_history_009", "category": "family_history", "angle": "Katherine Jackson's Jehovah's Witness faith and its influence on the Jackson children's upbringing"}, {"id": "family_history_010", "category": "family_history", "angle": "The Jackson 5 cartoon series airing on ABC from 1971 to 1973, based on the family band"}, {"id": "family_history_011", "category": "family_history", "angle": "Michael Jackson's early solo career beginning in 1971 while still performing with his brothers"}, {"id": "family_history_012", "category": "family_history", "angle": "The Jackson family's move from Motown to Epic Records in 1975, with the group renamed The Jacksons"}, {"id": "family_history_013", "category": "family_history", "angle": "Randy Jackson joining his older brothers in The Jacksons after Jermaine remained with Motown"}, {"id": "family_history_014", "category": "family_history", "angle": "The television miniseries The Jacksons: An American Dream, released in 1992, depicting the family's early years"}, {"id": "family_history_015", "category": "family_history", "angle": "Michael's relationship with his sister La Toya Jackson, who also pursued a music and entertainment career"}, {"id": "family_history_016", "category": "family_history", "angle": "Janet Jackson's career beginning as a child actress before becoming a recording artist in her own right"}, {"id": "family_history_017", "category": "family_history", "angle": "The Jackson family performing together on the Victory Tour in 1984, the only tour with all six brothers"}, {"id": "family_history_018", "category": "family_history", "angle": "Michael's decision to leave the Victory Tour proceeds to charity, donating his share"}, {"id": "family_history_019", "category": "family_history", "angle": "Joe Jackson's induction alongside his sons into discussions of the Jackson family's musical legacy"}, {"id": "family_history_020", "category": "family_history", "angle": "Michael Jackson's early television performances on variety shows including The Ed Sullivan Show in 1969"}, {"id": "family_history_021", "category": "family_history", "angle": "The Jackson 5's appearance on Soul Train in the early 1970s during the show's first years"}, {"id": "family_history_022", "category": "family_history", "angle": "Tito Jackson's role as guitarist for the Jackson 5 and later The Jacksons"}, {"id": "family_history_023", "category": "family_history", "angle": "Jermaine Jackson's choice to remain with Motown in 1975 while his brothers moved to Epic Records"}, {"id": "family_history_024", "category": "family_history", "angle": "The Jackson family's Encino California estate known as Hayvenhurst, purchased in the 1970s"}, {"id": "family_history_025", "category": "family_history", "angle": "Michael Jackson's description of his childhood touring schedule in his 1988 autobiography Moonwalk"}, {"id": "family_history_026", "category": "family_history", "angle": "The Jackson 5's first album Diana Ross Presents the Jackson 5, released in 1969"}, {"id": "family_history_027", "category": "family_history", "angle": "Michael's earliest known public performance, singing at age five with his brothers in Gary Indiana"}, {"id": "family_history_028", "category": "family_history", "angle": "The Jackson Five's transition into adulthood being documented through their changing sound on Epic Records"}, {"id": "family_history_029", "category": "family_history", "angle": "Rebbie Jackson, the eldest Jackson sibling, pursuing her own recording career separate from her brothers"}, {"id": "family_history_030", "category": "family_history", "angle": "Marlon Jackson's role as a dancer and vocalist in the Jackson 5 and The Jacksons"}, {"id": "family_history_031", "category": "family_history", "angle": "The Jackson family's appearance at the Motown 25th anniversary special in 1983, where MJ debuted the moonwalk"}, {"id": "family_history_032", "category": "family_history", "angle": "Michael Jackson's description of his father's strict rehearsal regimen during his childhood in multiple interviews"}, {"id": "family_history_033", "category": "family_history", "angle": "The Jacksons' 1980 album Triumph, featuring the hit single Can You Feel It with an accompanying short film"}, {"id": "family_history_034", "category": "family_history", "angle": "Michael's role in writing songs for The Jacksons' later albums including Can You Feel It and Shake Your Body"}, {"id": "family_history_035", "category": "family_history", "angle": "The Jackson family reuniting for the 30th anniversary concerts at Madison Square Garden in September 2001"}, {"id": "family_history_036", "category": "family_history", "angle": "Katherine Jackson's role in raising nine children while Joe Jackson managed their early career"}, {"id": "family_history_037", "category": "family_history", "angle": "The 2009 documentary This Is It including interview footage discussing MJ's relationship with his family"}, {"id": "family_history_038", "category": "family_history", "angle": "Michael Jackson's purchase of Hayvenhurst from his parents, which they continued to live in"}, {"id": "family_history_039", "category": "family_history", "angle": "The Jackson 5's reunion performance at the 1983 Motown 25 special, the first time in years all members performed together"}, {"id": "marriages_children_000", "category": "marriages_children", "angle": "Michael Jackson's marriage to Lisa Marie Presley in May 1994, announced publicly months after the ceremony"}, {"id": "marriages_children_001", "category": "marriages_children", "angle": "The 1995 interview with Diane Sawyer where MJ and Lisa Marie Presley discussed their marriage and denied rumors about it"}, {"id": "marriages_children_002", "category": "marriages_children", "angle": "Michael Jackson and Lisa Marie Presley's appearance together at the 1994 MTV Video Music Awards, including an on-stage kiss"}, {"id": "marriages_children_003", "category": "marriages_children", "angle": "The divorce of Michael Jackson and Lisa Marie Presley being finalized in 1996"}, {"id": "marriages_children_004", "category": "marriages_children", "angle": "Michael Jackson's marriage to Debbie Rowe in November 1996"}, {"id": "marriages_children_005", "category": "marriages_children", "angle": "Prince Michael Jackson Jr, MJ's first child, born in February 1997"}, {"id": "marriages_children_006", "category": "marriages_children", "angle": "Paris Michael Katherine Jackson, MJ's second child, born in April 1998"}, {"id": "marriages_children_007", "category": "marriages_children", "angle": "Debbie Rowe granting MJ full custody rights as part of their 2000 divorce settlement"}, {"id": "marriages_children_008", "category": "marriages_children", "angle": "Prince Michael Jackson II, known publicly as Blanket, born in 2002 via surrogate"}, {"id": "marriages_children_009", "category": "marriages_children", "angle": "MJ holding his infant son Blanket over a hotel balcony railing in Berlin in 2002, an incident that drew widespread criticism"}, {"id": "marriages_children_010", "category": "marriages_children", "angle": "Paris Jackson's public statements in later years discussing her childhood and her father"}, {"id": "marriages_children_011", "category": "marriages_children", "angle": "Prince Jackson's interviews after his father's death discussing memories of growing up with MJ"}, {"id": "marriages_children_012", "category": "marriages_children", "angle": "MJ's children appearing with him at the 2002 MTV Video Music Awards where he received the Artist of the Century-style honor"}, {"id": "marriages_children_013", "category": "marriages_children", "angle": "The custody arrangements following MJ's death in 2009, with Katherine Jackson granted guardianship of his three children"}, {"id": "marriages_children_014", "category": "marriages_children", "angle": "MJ's description in interviews of wanting to give his children a normal childhood despite his own fame"}, {"id": "marriages_children_015", "category": "marriages_children", "angle": "Prince, Paris and Blanket Jackson appearing at the Forest Lawn memorial service for their father in 2009"}, {"id": "marriages_children_016", "category": "marriages_children", "angle": "Lisa Marie Presley's public statements after MJ's death describing their relationship and friendship"}, {"id": "marriages_children_017", "category": "marriages_children", "angle": "Debbie Rowe's background as a dermatology nurse before her marriage to MJ"}, {"id": "marriages_children_018", "category": "marriages_children", "angle": "MJ's children being homeschooled for much of their early years, as later discussed by Paris Jackson in interviews"}, {"id": "marriages_children_019", "category": "marriages_children", "angle": "The Jackson family's joint statements following MJ's death regarding care of his three children"}, {"id": "marriages_children_020", "category": "marriages_children", "angle": "Paris Jackson's career as a model and musician in the years following her father's death"}, {"id": "marriages_children_021", "category": "marriages_children", "angle": "Prince Jackson's appearances at award shows and public events representing his father's estate"}, {"id": "marriages_children_022", "category": "marriages_children", "angle": "MJ's 2003 interview with Martin Bashir, Living with Michael Jackson, which included footage of him with his children wearing masks in public"}, {"id": "marriages_children_023", "category": "marriages_children", "angle": "The Bashir documentary's impact on public perception, including MJ's own statements about regretting some choices shown"}, {"id": "marriages_children_024", "category": "marriages_children", "angle": "MJ's description of choosing the names Prince and Paris for his children in interviews discussing their significance to him"}, {"id": "marriages_children_025", "category": "marriages_children", "angle": "The 1994 wedding ceremony between MJ and Lisa Marie Presley taking place in the Dominican Republic"}, {"id": "marriages_children_026", "category": "marriages_children", "angle": "MJ and Lisa Marie Presley's joint interview clips being widely replayed after their divorce was announced"}, {"id": "achievements_verified_000", "category": "achievements_verified", "angle": "Thriller becoming the best-selling album of all time worldwide, certified at over 30 million copies in the US alone by the RIAA"}, {"id": "achievements_verified_001", "category": "achievements_verified", "angle": "MJ winning eight Grammy Awards in a single night at the 1984 ceremony for the Thriller album"}, {"id": "achievements_verified_002", "category": "achievements_verified", "angle": "Billie Jean spending seven weeks at number one on the Billboard Hot 100 in 1983"}, {"id": "achievements_verified_003", "category": "achievements_verified", "angle": "MJ's induction into the Rock and Roll Hall of Fame as a solo artist in 2001"}, {"id": "achievements_verified_004", "category": "achievements_verified", "angle": "The Jackson 5's induction into the Rock and Roll Hall of Fame in 1997"}, {"id": "achievements_verified_005", "category": "achievements_verified", "angle": "Thriller spending 37 weeks at number one on the Billboard 200 album chart"}, {"id": "achievements_verified_006", "category": "achievements_verified", "angle": "MJ receiving a star on the Hollywood Walk of Fame as a solo artist in 1984"}, {"id": "achievements_verified_007", "category": "achievements_verified", "angle": "Bad becoming the first album in history to produce five number one singles on the Billboard Hot 100"}, {"id": "achievements_verified_008", "category": "achievements_verified", "angle": "You Are Not Alone becoming the first song to debut at number one on the Billboard Hot 100 in 1995"}, {"id": "achievements_verified_009", "category": "achievements_verified", "angle": "MJ's Dangerous album debuting at number one on the Billboard 200 in 1991"}, {"id": "achievements_verified_010", "category": "achievements_verified", "angle": "The Thriller short film's preservation by the Library of Congress in the National Film Registry in 2009"}, {"id": "achievements_verified_011", "category": "achievements_verified", "angle": "MJ receiving the Grammy Legend Award in 1993"}, {"id": "achievements_verified_012", "category": "achievements_verified", "angle": "Off The Wall becoming the first solo album to generate four top 10 hit singles in the United States"}, {"id": "achievements_verified_013", "category": "achievements_verified", "angle": "MJ's total of 13 Grammy Awards won over his career"}, {"id": "achievements_verified_014", "category": "achievements_verified", "angle": "The Beatles catalog acquisition by MJ's company ATV Music in 1985 for approximately $47.5 million"}, {"id": "achievements_verified_015", "category": "achievements_verified", "angle": "HIStory entering the Billboard 200 at number one in 1995 as a double album"}, {"id": "achievements_verified_016", "category": "achievements_verified", "angle": "MJ being honored at the World Music Awards multiple times throughout the 1990s and 2000s"}, {"id": "achievements_verified_017", "category": "achievements_verified", "angle": "The Bad World Tour 1987-1989 becoming one of the highest-grossing tours of its era"}, {"id": "achievements_verified_018", "category": "achievements_verified", "angle": "MJ's Dangerous World Tour 1992-1993 being the first major Western pop tour to extensively visit parts of Eastern Europe and Africa"}, {"id": "achievements_verified_019", "category": "achievements_verified", "angle": "The HIStory World Tour 1996-1997 visiting 58 cities across five continents"}, {"id": "achievements_verified_020", "category": "achievements_verified", "angle": "MJ's sales certifications across his catalog making him one of the best-selling music artists in history according to the RIAA"}, {"id": "achievements_verified_021", "category": "achievements_verified", "angle": "The 1993 Super Bowl XXVII halftime show being credited with establishing the modern model of A-list halftime performances"}, {"id": "achievements_verified_022", "category": "achievements_verified", "angle": "MJ's Motown 25 performance of Billie Jean in 1983 being cited by television historians as one of the most replayed clips in TV history"}, {"id": "achievements_verified_023", "category": "achievements_verified", "angle": "Smooth Criminal's music video featuring the gravity-defying lean that required custom shoe technology patented by MJ and his collaborators"}, {"id": "achievements_verified_024", "category": "achievements_verified", "angle": "MJ's catalog of music videos contributing to multiple inductions and honors at the MTV Video Music Awards including the Video Vanguard Award in 1988"}, {"id": "performances_verified_000", "category": "performances_verified", "angle": "MJ's performance of Billie Jean at the Motown 25: Yesterday, Today, Forever special on May 16 1983, debuting the moonwalk on television"}, {"id": "performances_verified_001", "category": "performances_verified", "angle": "MJ's Super Bowl XXVII halftime performance on January 31 1993 in Pasadena California"}, {"id": "performances_verified_002", "category": "performances_verified", "angle": "MJ performing with his brothers as the Jackson 5 on The Ed Sullivan Show in December 1969"}, {"id": "performances_verified_003", "category": "performances_verified", "angle": "MJ's performance at the 1984 Grammy Awards where Eddie Van Halen joined him on stage for Beat It"}, {"id": "performances_verified_004", "category": "performances_verified", "angle": "The Bad World Tour opening night in Tokyo Japan in September 1987"}, {"id": "performances_verified_005", "category": "performances_verified", "angle": "MJ's 10 sold-out shows at Wembley Stadium during the Bad Tour in 1988, setting a Guinness World Record"}, {"id": "performances_verified_006", "category": "performances_verified", "angle": "MJ's performance at the 1995 MTV Video Music Awards performing a medley with Janet Jackson"}, {"id": "performances_verified_007", "category": "performances_verified", "angle": "The Dangerous World Tour opening concert in Munich Germany in June 1992"}, {"id": "performances_verified_008", "category": "performances_verified", "angle": "MJ's appearance at the 1996 Brit Awards performing Earth Song, during which Jarvis Cocker of Pulp interrupted the performance"}, {"id": "performances_verified_009", "category": "performances_verified", "angle": "MJ's HIStory World Tour opening ceremony in New York with a statue unveiling in 1995"}, {"id": "performances_verified_010", "category": "performances_verified", "angle": "The Victory Tour in 1984, the only tour MJ performed with all five of his brothers as adults"}, {"id": "performances_verified_011", "category": "performances_verified", "angle": "MJ's performance at the 30th Anniversary Celebration concerts at Madison Square Garden in September 2001"}, {"id": "performances_verified_012", "category": "performances_verified", "angle": "The recording of the This Is It rehearsal footage at the Staples Center in Los Angeles in 2009"}, {"id": "performances_verified_013", "category": "performances_verified", "angle": "MJ's appearance performing Man in the Mirror at the 1988 Grammy Awards"}, {"id": "performances_verified_014", "category": "performances_verified", "angle": "The Jackson 5's first appearance on American Bandstand in the early 1970s"}, {"id": "performances_verified_015", "category": "performances_verified", "angle": "MJ's solo performance debut on Soul Train performing songs from his early solo albums"}, {"id": "performances_verified_016", "category": "performances_verified", "angle": "The Bad Tour's Yokohama Japan stop in 1987 marking the official start of the tour"}, {"id": "performances_verified_017", "category": "performances_verified", "angle": "MJ's appearance at the American Music Awards in 1984 where he won a record 8 awards in one night"}, {"id": "performances_verified_018", "category": "performances_verified", "angle": "MJ's Dangerous Tour stop in Bucharest Romania in 1992, later released as an HBO special"}, {"id": "performances_verified_019", "category": "performances_verified", "angle": "The HIStory Tour's final concert in Durban South Africa in October 1997"}, {"id": "relationships_verified_000", "category": "relationships_verified", "angle": "MJ's collaboration with Quincy Jones beginning with Off The Wall in 1979 and continuing through Bad in 1987"}, {"id": "relationships_verified_001", "category": "relationships_verified", "angle": "Quincy Jones's role as producer on Thriller, the best-selling album in history"}, {"id": "relationships_verified_002", "category": "relationships_verified", "angle": "MJ's friendship with Elizabeth Taylor, which began in the early 1980s and lasted until his death"}, {"id": "relationships_verified_003", "category": "relationships_verified", "angle": "Elizabeth Taylor introducing MJ at the 1989 Soul Train Music Awards where he received the Heritage Award"}, {"id": "relationships_verified_004", "category": "relationships_verified", "angle": "MJ's collaboration with Paul McCartney on The Girl Is Mine and Say Say Say in the early 1980s"}, {"id": "relationships_verified_005", "category": "relationships_verified", "angle": "The business relationship between MJ and Paul McCartney becoming complicated after MJ purchased the Beatles song catalog in 1985"}, {"id": "relationships_verified_006", "category": "relationships_verified", "angle": "MJ's collaboration with Eddie Van Halen on the guitar solo for Beat It in 1982"}, {"id": "relationships_verified_007", "category": "relationships_verified", "angle": "MJ's collaboration with Slash on guitar parts for Black or White and Give In To Me from the Dangerous album"}, {"id": "relationships_verified_008", "category": "relationships_verified", "angle": "MJ's friendship with Diana Ross dating back to his childhood at Motown, with Ross credited on his first solo album"}, {"id": "relationships_verified_009", "category": "relationships_verified", "angle": "Teddy Riley's production work with MJ on the Dangerous album in 1991, introducing New Jack Swing elements"}, {"id": "relationships_verified_010", "category": "relationships_verified", "angle": "MJ's collaboration with Janet Jackson on the song and video for Scream in 1995"}, {"id": "relationships_verified_011", "category": "relationships_verified", "angle": "MJ's friendship with Marlon Brando, who appeared in the short film for You Rock My World in 2001"}, {"id": "relationships_verified_012", "category": "relationships_verified", "angle": "The collaboration between MJ and director Spike Lee on the They Don't Care About Us music videos in 1996"}, {"id": "relationships_verified_013", "category": "relationships_verified", "angle": "MJ's working relationship with choreographer Vincent Paterson, who worked on the Thriller and Smooth Criminal videos"}, {"id": "relationships_verified_014", "category": "relationships_verified", "angle": "MJ's collaboration with director John Landis on the Thriller short film in 1983"}, {"id": "relationships_verified_015", "category": "relationships_verified", "angle": "MJ's collaboration with director Martin Scorsese on the Bad short film in 1987"}, {"id": "relationships_verified_016", "category": "relationships_verified", "angle": "Rod Temperton's songwriting contributions across Off The Wall and Thriller, including Thriller, Rock With You, and Off The Wall"}, {"id": "relationships_verified_017", "category": "relationships_verified", "angle": "MJ's collaboration with Siedah Garrett, who co-wrote Man in the Mirror and sang the duet I Just Can't Stop Loving You"}, {"id": "relationships_verified_018", "category": "relationships_verified", "angle": "MJ's friendship with Macaulay Culkin, who appeared in the Black or White short film in 1991"}, {"id": "relationships_verified_019", "category": "relationships_verified", "angle": "MJ's collaboration with Bruce Swedien, the recording engineer on Off The Wall, Thriller, Bad, and Dangerous"}]

def load_stories():
    """Load stories from volume file or fall back to embedded"""
    try:
        if os.path.exists(STORIES_FILE):
            with open(STORIES_FILE) as f:
                stories = _json.load(f)
            print(f"[MJ] Loaded {len(stories)} stories from volume {STORIES_FILE}")
            return stories
        else:
            print(f"[MJ] No stories file at {STORIES_FILE} - using {len(EMBEDDED_STORIES)} embedded stories")
    except Exception as e:
        print(f"[MJ] ERROR loading stories: {e}")
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
                ids = set(_json.load(f))
            print(f"[MJ] Loaded {len(ids)} used IDs from {USED_FILE}")
            return ids
        else:
            print(f"[MJ] No used IDs file at {USED_FILE} - starting fresh")
    except Exception as e:
        print(f"[MJ] ERROR loading used IDs: {e}")
    return set()

def save_used_ids(used_ids):
    """Save used story IDs"""
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        with open(USED_FILE, 'w') as f:
            _json.dump(list(used_ids), f)
        print(f"[MJ] Saved {len(used_ids)} used IDs to {USED_FILE}")
    except Exception as e:
        print(f"[MJ] ERROR saving used IDs to {USED_FILE}: {e}")

def mark_stories_used(story_ids):
    """Mark stories as used"""
    used = load_used_ids()
    used.update(story_ids)
    # Keep all used IDs up to total story count - only trim if database grows very large
    all_stories = load_stories()
    max_used = max(len(all_stories) - 50, 400)  # always keep 50 fresh
    if len(used) > max_used:
        used = set(list(used)[-max_used:])
    save_used_ids(used)

CATEGORY_WEIGHTS = {
    "song_histories": 3,
    "family_history": 3,
    "marriages_children": 2,
    "achievements_verified": 2,
    "performances_verified": 2,
    "relationships_verified": 2,
}

# On This Day - verified significant MJ dates (month-day: event)
ON_THIS_DAY = {
  "01-01": "The Jackson 5 began 1970 with their debut single I Want You Back already climbing the Billboard Hot 100, where it would reach number one",
  "01-02": "Michael Jackson's Thriller album was certified 10x Platinum by the RIAA in 1988, recognizing ten million copies sold in the United States",
  "01-06": "The Jackson 5 appeared on American Bandstand for the first time in 1970, performing I Want You Back for a national television audience",
  "01-10": "Michael Jackson's Off The Wall album was certified Platinum by the RIAA in 1980, his first solo album to achieve that milestone",
  "01-14": "I Want You Back by the Jackson 5 reached number one on the Billboard Hot 100 in 1970, the group's first number one single",
  "01-15": "Michael Jackson's Dangerous World Tour opened in Munich Germany in 1992, his first major tour since the Bad World Tour",
  "01-16": "The Making of Michael Jackson's Thriller documentary premiered on MTV in 1984, giving fans a behind-the-scenes look at the landmark short film",
  "01-18": "Michael Jackson attended the American Music Awards in 1984 where he won eight awards in a single night, a record at the time",
  "01-21": "Michael Jackson's Black or White reached number one on the Billboard Hot 100 in 1992, where it stayed for seven weeks",
  "01-23": "The Jackson 5 signed their first recording contract with Steeltown Records in Gary Indiana in 1968",
  "01-25": "The Jackson 5 performed on American Bandstand in 1970, one of their earliest major national television appearances",
  "01-27": "Michael Jackson's hair caught fire during the filming of a Pepsi commercial at the Shrine Auditorium in Los Angeles in 1984",
  "01-28": "We Are the World was recorded at A&M Studios in Hollywood in 1985 with 45 artists gathered after the American Music Awards",
  "01-30": "Michael Jackson's Billie Jean music video premiered on MTV in 1983, one of the first videos by a Black artist to receive heavy rotation on the channel",
  "02-01": "Michael Jackson's Super Bowl XXVII halftime performance in Pasadena California in 1993 was watched by an estimated 133 million viewers in the United States",
  "02-03": "The Jackson 5 performed at the Apollo Theater in Harlem in 1970, one of their earliest New York appearances following their Motown debut",
  "02-07": "Michael Jackson turned 25 years old in 1983, the same year Thriller was released and became the best-selling album of all time",
  "02-08": "Rock With You by Michael Jackson reached number one on the Billboard Hot 100 in 1980, his second consecutive solo number one",
  "02-10": "Michael Jackson's You Are Not Alone became the first song in history to debut at number one on the Billboard Hot 100 in 1995",
  "02-14": "Michael Jackson's Thriller album went to number one on the Billboard 200 album chart in 1983 where it would spend 37 weeks",
  "02-16": "Prince Michael Jackson Jr, MJ's first child, was born in 1997",
  "02-19": "Michael Jackson's Beat It reached number one on the Billboard Hot 100 in 1983, making it his second number one from the Thriller album",
  "02-22": "Michael Jackson performed Beat It at the Grammy Awards in 1984 with Eddie Van Halen joining him on stage",
  "02-25": "Michael Jackson accepted his record eighth Grammy Award in a single night at the 26th Grammy Awards ceremony in Los Angeles in 1984",
  "02-26": "Michael Jackson's Billie Jean spent its seventh and final week at number one on the Billboard Hot 100 in 1983",
  "02-28": "Michael Jackson won eight Grammy Awards in one night at the 26th Grammy Awards in 1984, breaking the record for most wins in a single night by a single artist",
  "03-01": "Michael Jackson's Thriller album was certified Diamond by the RIAA in 1999 recognizing sales of ten million copies in the United States",
  "03-02": "Michael Jackson received a star on the Hollywood Walk of Fame in Los Angeles in 1984",
  "03-05": "We Are the World was released as a single in 1985 and immediately became the fastest-selling American pop single in history",
  "03-07": "Michael Jackson's Man in the Mirror reached number one on the Billboard Hot 100 in 1988, his eleventh number one single",
  "03-10": "The Way You Make Me Feel by Michael Jackson reached number one on the Billboard Hot 100 in 1988",
  "03-14": "Michael Jackson's Dirty Diana reached number one on the Billboard Hot 100 in 1988, the fifth consecutive number one single from the Bad album",
  "03-19": "Michael Jackson received the Grammy Legend Award at the 35th Grammy Awards in Los Angeles in 1993",
  "03-25": "Michael Jackson debuted the moonwalk on national television during the Motown 25: Yesterday Today and Forever special in 1983 while performing Billie Jean",
  "03-28": "Michael Jackson's Dangerous album was certified 7x Platinum by the RIAA in 1993",
  "03-31": "Michael Jackson's I'll Be There with the Jackson 5 was certified Gold by the RIAA",
  "04-05": "ABC by the Jackson 5 reached number one on the Billboard Hot 100 in 1970, the group's second consecutive number one single",
  "04-06": "The Heal the World Foundation was officially established by Michael Jackson in 1992 to support children in need around the world",
  "04-11": "Michael Jackson's The Girl Is Mine with Paul McCartney was released as the first single from the Thriller album in 1982",
  "04-16": "Paris Michael Katherine Jackson was born in Los Angeles in 1998",
  "04-18": "I'll Be There by the Jackson 5 was released as a single in 1970, becoming their fourth consecutive number one hit",
  "04-23": "Michael Jackson's Bad album was certified 8x Platinum by the RIAA",
  "04-25": "Michael Jackson appeared on the cover of Life magazine in 1984 following his record Grammy wins",
  "04-30": "Michael Jackson's Heal the World Foundation airlifted 47,000 pounds of supplies to Sarajevo in 1992 during the Bosnian War",
  "05-03": "Michael Jackson's I Just Can't Stop Loving You reached number one on the Billboard Hot 100 in 1987, the first single from the Bad album",
  "05-09": "The Jackson 5's I'll Be There spent its fifth week at number one on the Billboard Hot 100 in 1970",
  "05-14": "Michael Jackson and Lisa Marie Presley were married in a private ceremony in La Vega in the Dominican Republic in 1994",
  "05-16": "Motown 25: Yesterday Today and Forever aired on NBC in 1983 featuring MJ's historic moonwalk debut during Billie Jean",
  "05-18": "Earth Song was performed at the 1996 BRIT Awards ceremony where Jarvis Cocker of Pulp invaded the stage during the performance",
  "05-22": "Michael Jackson's Smooth Criminal reached number seven on the Billboard Hot 100 in 1988",
  "06-01": "The Blood on the Dance Floor: HIStory in the Mix remix album was released in 1997 and went on to become the best-selling remix album of all time",
  "06-03": "Michael Jackson's HIStory World Tour opened in Prague Czech Republic in 1996 before crowds of 120,000 fans",
  "06-07": "Michael Jackson's Bad World Tour opened in Yokohama Japan in 1987 to sold-out crowds",
  "06-11": "Michael Jackson's Scream featuring Janet Jackson was released as a single in 1995 from the HIStory album",
  "06-14": "Michael Jackson's HIStory: Past Present and Future Book I was certified 4x Platinum by the RIAA in 1995",
  "06-15": "Michael Jackson's Dangerous World Tour opened in Munich Germany on June 27 1992, his most extensive international tour",
  "06-16": "Michael Jackson's HIStory: Past Present and Future Book I was released in 1995 debuting at number one on the Billboard 200",
  "06-20": "Michael Jackson performed at the Royal Variety Performance in London in 1983 for Queen Elizabeth II",
  "06-24": "Michael Jackson held what became his final rehearsal at the Staples Center in Los Angeles in 2009 for the This Is It concert series",
  "06-25": "Michael Jackson passed away at age 50 at UCLA Medical Center in Los Angeles on June 25 2009",
  "06-27": "The Dangerous World Tour opened in Munich Germany in 1992, MJ's first tour in four years",
  "06-30": "Michael Jackson's Thriller album returned to the top five of the Billboard 200 in 1983 months after its initial release",
  "07-01": "The HIStory World Tour concluded in Durban South Africa in 1997 after visiting 58 cities across five continents",
  "07-04": "The Victory Tour opened in Kansas City Missouri in 1984, the only concert tour featuring all six Jackson brothers as adults",
  "07-07": "A public memorial service for Michael Jackson was held at the Staples Center in Los Angeles in 2009 attended by 17,000 fans",
  "07-09": "Michael Jackson's estate filed its first financial disclosures after his death in 2009 revealing the scale of his assets and liabilities",
  "07-16": "The Bad World Tour officially opened in Yokohama Japan in 1987 launching what became one of the highest-grossing tours of its era",
  "07-20": "Michael Jackson performed his 10th and final sold-out show at Wembley Stadium during the Bad Tour in 1988, a Guinness World Record",
  "07-25": "Michael Jackson's You Rock My World was released as the lead single from the Invincible album in 2001",
  "08-05": "Michael Jackson's Don't Stop Til You Get Enough was released as a single in 1979, becoming his first solo number one as an adult",
  "08-10": "Michael Jackson purchased the ATV Music catalog including the majority of Beatles song publishing rights for approximately 47.5 million dollars in 1985",
  "08-14": "Michael Jackson's Off The Wall album was released in 1979, the first solo album to generate four top ten singles in the United States",
  "08-16": "Michael Jackson performed at the closing night of the HIStory World Tour in Durban South Africa in 1997",
  "08-22": "Michael Jackson's Thriller album began its legendary 37-week run at number one on the Billboard 200 in 1983",
  "08-25": "Michael Jackson's Don't Stop Til You Get Enough reached number one on the Billboard Hot 100 in 1979, his first adult solo number one",
  "08-29": "Michael Joseph Jackson was born in Gary Indiana in 1958, the seventh of nine children of Joseph and Katherine Jackson",
  "08-31": "Thriller was certified Diamond by the RIAA recognizing ten million copies sold in the United States",
  "09-01": "Michael Jackson's Bad album was released worldwide in 1987 and went on to produce five consecutive number one singles on the Billboard Hot 100",
  "09-07": "Michael Jackson performed at the 30th Anniversary Celebration concerts at Madison Square Garden in New York in 2001",
  "09-09": "Michael Jackson's Thriller album was certified 29x Platinum by the RIAA making it the best-certified album in American music history",
  "09-10": "Michael Jackson's Scream featuring Janet Jackson debuted at number five on the Billboard Hot 100 in 1995, the highest chart debut in history at that time",
  "09-14": "The Black or White music video premiered simultaneously on Fox BET MTV and VH1 in 1991, reaching an estimated 500 million viewers worldwide",
  "09-19": "Michael Jackson's Bad album was certified 10x Platinum by the RIAA",
  "09-22": "Michael Jackson appeared on the cover of Rolling Stone magazine in 1983 following the success of the Thriller album",
  "09-25": "Michael Jackson's Thriller album was certified 20x Platinum by the RIAA",
  "10-03": "The Thriller short film directed by John Landis premiered on MTV in 1983 and changed the music video format permanently",
  "10-04": "Michael Jackson's Earth Song was certified Platinum in the United Kingdom in 1995",
  "10-07": "Michael Jackson's Invincible album debuted at number one on the Billboard 200 in 2001",
  "10-14": "The Dangerous World Tour concluded in Mexico City in 1993 after 69 concerts across four continents",
  "10-19": "Michael Jackson performed at the American Music Awards in 1984 accepting several of his record eight wins from earlier that year",
  "10-22": "Michael Jackson's Remember the Time was released as a single in 1992 from the Dangerous album",
  "10-26": "Michael Jackson's Dangerous album was certified 4x Platinum by the RIAA in 1992",
  "10-30": "Vincent Price recorded his famous rap monologue for the Thriller song at Westlake Recording Studios in Los Angeles in 1982",
  "11-06": "Earth Song by Michael Jackson reached number one in the United Kingdom in 1995 where it remained for six consecutive weeks",
  "11-11": "Michael Jackson's You Are Not Alone won the Grammy Award for Best R&B Vocal Performance in 1996",
  "11-12": "Michael Jackson's Invincible album was released worldwide in 2001, his final studio album of new material released during his lifetime",
  "11-14": "Michael Jackson and his brothers signed with Epic Records in 1975 after departing from Motown Records",
  "11-17": "The Jackson 5 released their debut album Diana Ross Presents the Jackson 5 on Motown Records in 1969",
  "11-20": "Michael Jackson's Dangerous album was released worldwide in 1991 debuting at number one on the Billboard 200",
  "11-22": "Michael Jackson's Blood on the Dance Floor reached number one in the United Kingdom in 1997",
  "11-24": "Heal the World by Michael Jackson was released as a single in 1992 from the Dangerous album",
  "11-28": "The Jackson 5 performed on The Ed Sullivan Show in 1969, one of their earliest national television appearances",
  "11-30": "Michael Jackson's Thriller album was released by Epic Records in 1982 and went on to become the best-selling album of all time",
  "12-01": "The Victory Tour concluded in Los Angeles in 1984 after 55 performances across North America",
  "12-05": "Michael Jackson's Off The Wall was certified 8x Platinum by the RIAA",
  "12-09": "Berry Gordy signed the Jackson 5 to Motown Records in 1968 after seeing them perform at a talent showcase in Chicago",
  "12-10": "Michael Jackson received the MTV Video Vanguard Award in 1988, later renamed the Michael Jackson Video Vanguard Award in his honor",
  "12-14": "Michael Jackson's Off The Wall album was certified Platinum in the United Kingdom in 1979",
  "12-21": "Michael Jackson's Will You Be There from the Free Willy soundtrack reached number nine on the Billboard Hot 100 in 1993",
  "12-26": "The Bad World Tour concluded in Los Angeles in 1989 after 123 concerts across 15 countries and 4.4 million tickets sold",
  "12-29": "The Jackson 5 performed their first professional concert in Gary Indiana in 1967",
  "12-31": "Michael Jackson performed at the closing concert of the Dangerous World Tour in Mexico City in 1993 to a sold-out crowd"
}


def get_on_this_day(month=None, day=None):
    """Return the On This Day event for a given date"""
    import datetime
    if month is None or day is None:
        now = datetime.datetime.utcnow()
        month, day = now.month, now.day
    key = "%02d-%02d" % (month, day)
    if key in ON_THIS_DAY:
        return {"key": key, "event": ON_THIS_DAY[key], "exact": True}
    # Find closest date in same month
    month_prefix = "%02d" % month
    month_dates = {k: v for k, v in ON_THIS_DAY.items() if k.startswith(month_prefix)}
    if month_dates:
        closest = min(month_dates.keys(), key=lambda k: abs(int(k[3:]) - day))
        return {"key": closest, "event": month_dates[closest], "exact": False}
    # Fall back to a fixed notable date
    return {"key": "08-29", "event": ON_THIS_DAY["08-29"], "exact": False}


# On This Day database - verified significant MJ dates
ON_THIS_DAY = {"01-25": "The Jackson 5 performed on American Bandstand for the first time in 1970, their national television debut", "01-27": "Michael Jackson's hair caught fire during the filming of a Pepsi commercial at the Shrine Auditorium in Los Angeles in 1984", "01-28": "We Are the World was recorded at A&M Studios in Hollywood in 1985 with 45 artists gathered after the American Music Awards", "02-22": "Michael Jackson performed Beat It live at the Grammy Awards in 1984 with Eddie Van Halen joining on guitar", "02-28": "Michael Jackson won eight Grammy Awards in one night at the 26th Grammy Awards in 1984, breaking the record for most wins in a single night", "03-02": "Michael Jackson received a star on the Hollywood Walk of Fame in 1984", "03-05": "We Are the World was released as a single in 1985, becoming the fastest-selling American pop single in history at the time", "03-25": "Michael Jackson debuted the moonwalk on national television during the Motown 25 special in 1983, performing Billie Jean", "04-16": "Paris Michael Katherine Jackson was born in 1998", "05-14": "Michael Jackson and Lisa Marie Presley were married in a private ceremony in the Dominican Republic in 1994", "05-16": "Motown 25: Yesterday Today and Forever aired on NBC in 1983 featuring MJ's moonwalk debut", "06-16": "Michael Jackson's HIStory: Past Present and Future Book I was released in 1995 debuting at number one on the Billboard 200", "06-24": "Michael Jackson held what would be his final rehearsal at the Staples Center in Los Angeles in 2009 for the This Is It concert series", "06-25": "Michael Jackson passed away at age 50 in Los Angeles in 2009", "07-04": "The Victory Tour opened in Kansas City Missouri in 1984 reuniting all six Jackson brothers on stage", "07-16": "The Bad World Tour opened in Yokohama Japan in 1987", "08-10": "Michael Jackson purchased the ATV Music catalog including the majority of Beatles song publishing rights for approximately 47.5 million dollars in 1985", "08-29": "Michael Joseph Jackson was born in Gary Indiana in 1958", "09-01": "Michael Jackson's Bad album was released worldwide in 1987 going on to produce five consecutive number one singles in the United States", "09-07": "Michael Jackson performed at the 30th Anniversary Celebration concerts at Madison Square Garden in New York in 2001", "09-10": "Michael Jackson's Scream featuring Janet Jackson debuted at number five on the Billboard Hot 100 in 1995, the highest debut in chart history at that time", "09-14": "The Black or White music video premiered simultaneously on Fox BET MTV and VH1 in 1991", "10-03": "The Thriller music video premiered on MTV in 1983 directed by John Landis", "10-30": "Vincent Price recorded his rap segment for Thriller at Westlake Recording Studios in Los Angeles in 1982", "11-12": "Michael Jackson's Invincible album was released in 2001 his final studio album of new material", "11-14": "Michael Jackson and his brothers signed with Epic Records in 1975 departing from Motown", "11-20": "Michael Jackson's Dangerous album was released in 1991 debuting at number one on the Billboard 200", "11-30": "Michael Jackson's Thriller album was released in 1982 going on to become the best-selling album of all time", "12-09": "The Jackson 5 signed with Motown Records in 1968 after Berry Gordy saw them perform", "12-26": "The Bad Tour concluded in Los Angeles in 1989 after 123 concerts across 15 countries", "02-01": "Michael Jackson's Super Bowl XXVII halftime performance in Pasadena California in 1993 was watched by an estimated 133 million viewers", "02-10": "Michael Jackson's You Are Not Alone became the first song in history to debut at number one on the Billboard Hot 100 in 1995", "02-16": "Prince Michael Jackson Jr, MJ's first child, was born in 1997", "03-15": "The HIStory World Tour opened in Prague Czech Republic in 1996", "04-06": "The Heal the World Foundation was established by Michael Jackson in 1992", "05-18": "Earth Song was performed at the 1996 BRIT Awards where Jarvis Cocker of Pulp interrupted the performance", "06-01": "The Blood on the Dance Floor remix album was released in 1997 becoming the best-selling remix album of all time", "07-01": "The HIStory World Tour concluded in Durban South Africa in 1997", "08-15": "Michael Jackson delivered his speech at the Oxford Union in 2001", "10-14": "The Dangerous World Tour concluded in Mexico City in 1993", "11-06": "Earth Song reached number one in the United Kingdom in 1995 where it stayed for six weeks", "12-01": "The Victory Tour concluded in Los Angeles in 1984", "12-29": "The Jackson 5 performed their first professional concert in Gary Indiana in 1967"}

def get_on_this_day(month=None, day=None):
    """Get the On This Day event for a given date, or today if not specified"""
    import datetime
    if month is None or day is None:
        now = datetime.datetime.utcnow()
        month, day = now.month, now.day
    key = f"{month:02d}-{day:02d}"
    if key in ON_THIS_DAY:
        return {"key": key, "event": ON_THIS_DAY[key], "exact": True}
    # Find closest date in same month
    month_key = f"{month:02d}"
    month_dates = {k: v for k, v in ON_THIS_DAY.items() if k.startswith(month_key)}
    if month_dates:
        closest = min(month_dates.keys(), key=lambda k: abs(int(k[3:]) - day))
        return {"key": closest, "event": month_dates[closest], "exact": False}
    # Fall back to a random verified date
    import random
    random_key = random.choice(list(ON_THIS_DAY.keys()))
    return {"key": random_key, "event": ON_THIS_DAY[random_key], "exact": False}



def pick_stories(count, exclusions=None):
    """Pick count unique story angles, weighted and excluding recently used"""
    all_stories = load_stories()
    used_ids = load_used_ids()
    # Convert to ordered list so we know recency - items at end of list were used most recently
    used_ids_ordered = list(used_ids)
    exclusions = exclusions or []
    excl_lower = [e.lower()[:50] for e in exclusions]

    unused_pool = []
    # Split used into older (used longer ago) and recent (used recently)
    # Stories not in the last 100 used IDs are considered "older" and less likely to repeat
    recent_ids = set(used_ids_ordered[-100:]) if len(used_ids_ordered) > 100 else used_ids
    older_used_pool = []
    recent_used_pool = []

    for story in all_stories:
        angle_lower = story['angle'].lower()[:50]
        if any(angle_lower in e or e in angle_lower for e in excl_lower):
            continue
        weight = CATEGORY_WEIGHTS.get(story['category'], 1)
        if story['id'] not in used_ids:
            unused_pool.extend([story] * weight)
        elif story['id'] not in recent_ids:
            older_used_pool.extend([story] * weight)
        else:
            recent_used_pool.extend([story] * weight)

    # Priority: unused → older used → recently used
    if unused_pool:
        pool = unused_pool
    elif older_used_pool:
        pool = older_used_pool
    else:
        pool = recent_used_pool if recent_used_pool else all_stories

    _random_mj.shuffle(pool)

    seen = set()
    result = []
    for story in pool:
        key = story['angle'][:40]
        if key not in seen and len(result) < count:
            seen.add(key)
            result.append(story)

    # Fill remainder if needed (shouldn't happen normally)
    while len(result) < count:
        result.append(_random_mj.choice(all_stories))

    result = result[:count]
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
    # On This Day handler
    if override and override.lower() in ('on this day', 'on_this_day', 'otd'):
        otd = get_on_this_day()
        import datetime
        now = datetime.datetime.utcnow()
        date_str = now.strftime("%B %d")
        override = "ON THIS DAY - %s: %s" % (date_str, otd["event"])

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
        'CONTENT SOURCING RULES - absolute and non-negotiable: '
        '1. Only write about facts documented in named interviews, named publications, album credits, confirmed video/audio, or verified biographical sources. '
        '2. If no real documented source exists for a detail, do not include it. Write around only what is confirmed. '
        '3. Never invent dialogue, quotes, or witness accounts. Never attribute words to anyone without a named source. '
        '4. Never describe private moments, feelings, or events without a named source. '
        '5. Never fill gaps with plausible-sounding detail - if you do not know it, do not write it. '
        '6. NEVER frame anything as a "mystery," "lost," "vault," "never released," "leaked," or "hidden" unless that exact framing is independently verifiable - these framings tend to invite fabrication, so avoid them entirely. '
        '7. The post must reference the real source - the named interview, publication, album, documentary, or person. '
        'CONTENT PREFERENCES: Humanitarian stories, everyday life, family history, song/album facts, documented relationships. '
        'NEVER DEFAULT TO: Wembley Stadium, Thriller recording, Quincy Jones unless specifically requested. '
        'REAL-PERSON LIKENESS RULE: Anchor Michael Jackson authentic likeness to correct era with specific physical descriptors. State it is the real Michael Jackson. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Michael Jackson social media image posts.

{"MANDATORY THEME OVERRIDE  -  you MUST focus ALL posts on this specific topic: " + override + ". Do not deviate. Every post must directly address this theme." if override else "Draw from these content pillars, varying across all " + str(count) + " posts:"}
{chr(10).join([f"{i+1}. Write about THIS SPECIFIC story angle: {s['angle']}" for i, s in enumerate(selected_stories)]) if not override else ""}

{"TOPICS YOU MUST COMPLETELY AVOID  -  these have been used recently and MUST NOT appear in any form:" + chr(10) + chr(10).join(["- " + e for e in exclusions]) + chr(10) + "Do not reference these people, albums, tours, songs, or themes in any post. Find completely different angles." if exclusions else ""}

IMAGE PROMPT FORMAT - MUST MATCH THE STORY ANGLE:
The image must depict THE ACTUAL SUBJECT of the assigned story angle - not a generic MJ portrait.
For SONG/ALBUM stories, ROTATE through these scene types - do NOT default to recording studio every time:
  - Music video recreation: MJ in costume and setting from that song's actual music video (e.g. red jacket for Thriller, fedora and white suit for Smooth Criminal, military jacket for Black or White)
  - Stage performance: MJ mid-performance on tour, correct era, dramatic lighting, crowd energy
  - Album art era: artistic/editorial shot matching the visual aesthetic of that album's era (Off The Wall tuxedo look, Dangerous armored aesthetic, HIStory monument era, Invincible street era)
  - Candid/behind the scenes: a relaxed non-performing moment from that era - hotel lobby, airport, press event, award show red carpet
  - Recording studio: only use this occasionally, not as the default
  Choose whichever scene type best fits the specific song/album being referenced.
- If the story is about FAMILY/CHILDREN, the image MUST include the relevant family member(s) described (e.g. if the story is about Paris, show MJ WITH Paris in a warm family moment).
- If the story is about a MARRIAGE, depict MJ with that specific spouse in a documented public setting appropriate to that era.
- If the story is about a COLLABORATION, depict MJ with or alongside the named collaborator, or a creative session that feels like that specific partnership.
- If the story is about an ACHIEVEMENT or AWARD, depict MJ receiving or celebrating that achievement - award show, press conference, or triumphant performance moment.
- If the story is about FAMILY HISTORY/JACKSON 5, depict young MJ with his brothers in the appropriate era (late 1960s/early 1970s Motown aesthetic).
- If the story is about a PERFORMANCE, depict that specific performance's era, venue type, and costume.
Vary scene TYPE aggressively - across a batch of posts, no two images should use the same scene type.
Each image must anchor Michael Jackson authentic likeness to the correct era with specific physical descriptors.
MJ HAIR BY ERA - always specify the correct hair for the era depicted:
- Jackson 5 / early 1970s: large rounded Afro, natural texture
- Off The Wall era (1979): medium Afro, sometimes with a slight curl, fuller on top
- Thriller era (1982-1984): shoulder-length loosely curled black hair, often worn down or swept back - NOT short cropped
- Bad era (1987-1989): shoulder-length black curly hair, often with curls framing the face
- Dangerous era (1991-1993): long black curly hair past the shoulders, often worn loose or partially pulled back
- HIStory era (1995-1997): long black curly hair, similar to Dangerous era
- Invincible era (2001): medium-length black curly hair
- This Is It era (2009): medium-length black curly hair
NEVER depict MJ with short cropped hair unless specifically depicting a very early childhood photo (pre-Jackson 5).
State it is the real Michael Jackson. If other real people appear, name and describe them accurately for their era.
End with: "Optimized for 1080x1350 format."
CAPTION FORMAT  -  exactly 3 full paragraphs. Tone: {tone_map[tone]}
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis.
Paragraph 2: Develops the story with documented facts only  -  no invented details.
Paragraph 3: Clear engagement CTA  -  {cta_map[cta]}. Include 2 emojis.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, one documented verifiable fact + "Tag a friend" CTA. Never hashtags.

SOURCE (required): Name the actual source for the story in this post - the specific interview, named publication, documentary, book, or confirmed video. If you cannot name a real source, choose a different story from the database angle provided.

For each post include: "pillar" (2-3 word topic label  -  be SPECIFIC, e.g. "Off The Wall recording" not just "album")
and "topics_used" (comma-separated list of the specific topics, people, albums, songs referenced in this post)

JSON: {{"posts":[{{"imagePrompt":"...","caption":"...","firstComment":"...","pillar":"...","topics_used":"...","source":"[name the actual source - interview/publication/documentary/year this story comes from]"}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-6','max_tokens':16000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=180
        )
        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout  -  try generating fewer posts (5-8 at a time)'}), 500
        if 'error' in result:
            return jsonify({'ok':False,'error':result['error'].get('message','API error')}), 500
        if 'content' not in result:
            return jsonify({'ok':False,'error':'Unexpected API response: ' + str(result)[:200]}), 500
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        posts = json.loads(raw)
        return jsonify({'ok':True,'posts':posts['posts']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@mj_bp.route('/api/generate-banner', methods=['POST'])
def generate_banner():
    data       = request.get_json()
    count      = int(data.get('count', 3))
    override   = data.get('themeOverride', '').strip()
    exclusions = data.get('exclusions', [])

    # On This Day handler
    if override and override.lower() in ('on this day', 'on_this_day', 'otd'):
        otd = get_on_this_day()
        import datetime
        now = datetime.datetime.utcnow()
        date_str = now.strftime("%B %d")
        override = "ON THIS DAY - %s: %s" % (date_str, otd["event"])

    stories = pick_stories(count, exclusions)

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'Generate typographic banner concepts  -  no people, no photography, text on gradient background only. '
        'Banners must be vibrant, scroll-stopping, and emotionally powerful. '
        'The banner text must always be a QUESTION that invites comments, not a declarative statement. '
        'CONTENT SOURCING RULES for the caption text: '
        '1. Only reference facts documented in named interviews, publications, album credits, or verified sources. '
        '2. Never invent dialogue, quotes, or private moments. Never fill gaps with plausible detail. '
        '3. NEVER frame anything as a "mystery," "lost," "vault," "never released," "leaked," or "hidden" unless independently verifiable - avoid these framings entirely. '
        '4. The caption must reference the real source - the named interview, publication, album, or person. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Michael Jackson typographic banner concepts.

{"MANDATORY TOPIC: " + override + "  -  ALL banners must directly address this specific topic." if override else "Each banner MUST be based on a DIFFERENT story angle below  -  do not combine them:" + chr(10) + chr(10).join([f"Banner {i+1}: {s['angle']}" for i, s in enumerate(stories)])}

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

SOURCE (required): Name the actual source for the fact referenced - the specific interview, named publication, album, documentary, or person. If you cannot name a real source, choose a different angle.

JSON: {{"banners":[{{"bannerPrompt":"...","caption":"...","firstComment":"...","pillar":"...","source":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-6','max_tokens':6000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=180
        )
        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout  -  please try again'}), 500
        if 'error' in result:
            return jsonify({'ok':False,'error':'API error: ' + str(result['error'].get('message', result['error']))}), 500
        if 'content' not in result:
            return jsonify({'ok':False,'error':'Unexpected API response: ' + str(result)[:200]}), 500
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        banners = json.loads(raw)
        return jsonify({'ok':True,'banners':banners['banners']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@mj_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    try:
        data       = request.get_json()
        video_type = data.get('videoType', 'short')
        count      = int(data.get('count', 3))
        override   = data.get('themeOverride', '').strip()
        exclusions = data.get('exclusions', [])
        tone       = data.get('tone', 'cinematic')

        # On This Day handler
        if override and override.lower() in ('on this day', 'on_this_day', 'otd'):
            otd = get_on_this_day()
            import datetime
            now = datetime.datetime.utcnow()
            date_str = now.strftime("%B %d")
            override = "ON THIS DAY - %s: %s" % (date_str, otd["event"])

        stories = pick_stories(count, exclusions)

        if video_type == 'short':
            image_count = 5
            word_count = "75-90 words"
            duration_label = "30-second"
        else:
            image_count = 10
            word_count = "150-170 words"
            duration_label = "60-second"

        tone_map = {
            'cinematic':    'Cinematic and documentary — precise, measured, authoritative. Like a Netflix documentary narrator.',
            'emotional':    'Emotional and intimate — warm, personal, occasionally vulnerable.',
            'nostalgic':    'Nostalgic — wistful, reflective, takes the viewer back in time.',
            'inspirational':'Inspirational — uplifting, forward-looking, celebrates what he achieved.',
            'dramatic':     'Dramatic — bold, building tension and release, punchy short lines.',
        }
        tone_instruction = tone_map.get(tone, tone_map['cinematic'])

        extra_images = ''
        if image_count == 10:
            extra_images = (
                ',{"num":6,"prompt":"..."},'
                '{"num":7,"prompt":"..."},'
                '{"num":8,"prompt":"..."},'
                '{"num":9,"prompt":"..."},'
                '{"num":10,"prompt":"..."}'
            )

        system_prompt = (
            'You are the creative director for a viral Michael Jackson tribute page producing short-form video content. '
            'You generate complete video production packages: narration scripts for ElevenLabs voiceover '
            'and sequential image prompts for OpenArt/Seedance/Kling animation. '
            'CONTENT SOURCING RULES: '
            '1. Only reference documented facts from named interviews, publications, album credits, or verified sources. '
            '2. Never invent dialogue, quotes, or private moments. '
            '3. Never frame anything as mystery, lost, vault, or unreleased unless independently verifiable. '
            'IMAGE PROMPT RULES: '
            'All images are 9:16 vertical format. '
            'Each image is a distinct scene - sequential images tell a visual story together. '
            'Describe subject, setting, lighting, and camera framing as separate elements. '
            'Never mix camera movement and subject movement in the same sentence. '
            'Avoid the word "fast" - it degrades AI video quality. '
            'Include era-accurate MJ physical descriptors in every image prompt. '
            'MJ HAIR BY ERA: Jackson 5/early 70s = large Afro; Off The Wall 1979 = medium Afro; '
            'Thriller era 1982-84 = shoulder-length loosely curled black hair; '
            'Bad era 1987-89 = shoulder-length black curly hair with curls framing face; '
            'Dangerous and HIStory 1991-97 = long black curly hair past shoulders; '
            'Invincible and This Is It 2001-09 = medium-length black curly hair. '
            'NEVER short cropped hair. Always state the real Michael Jackson. '
            'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
        )

        story_list = "\n".join(["Video %d: %s" % (i+1, s["angle"]) for i, s in enumerate(stories)])
        if override:
            topic_block = "MANDATORY TOPIC: " + override + "  -  ALL videos must directly address this topic."
        else:
            topic_block = "Each video MUST use a DIFFERENT story angle:\n" + story_list
        user_prompt = f"""Generate exactly {count} unique Michael Jackson {duration_label} video production packages.

{topic_block}

TONE: {tone_instruction}

Each package must contain:

1. NARRATION SCRIPT ({word_count} — reads naturally in {duration_label} at ElevenLabs pace)
- Written for spoken voiceover — natural rhythm, not written prose
- Short punchy lines with line breaks for pacing and breath
- First line must be a powerful hook that stops the scroll
- Build emotional momentum throughout
- End with: Follow MJ Uncovered for more stories like this
- NO emojis. Plain text only. No hashtags.
- Only documented verifiable facts

2. {image_count} IMAGE PROMPTS (each animates to approximately 6 seconds in Seedance or Kling)
- 9:16 vertical format for all images
- Sequential scenes that tell the visual story of the narration
- Vary framing across all images: close-up, medium shot, wide shot, detail shot, portrait
- Each prompt format: [subject and appearance] + [setting] + [lighting] + [camera framing]
- Never write camera movement and subject movement in the same sentence
- Never use the word "fast"
- Include era-accurate MJ hair and appearance in every prompt
- Rotate scene types: do not use recording studio for more than 2 images

3. CAPTION (3 paragraphs — Facebook/Instagram)
- Hook paragraph with 2-3 emojis
- Story paragraph with documented facts
- CTA paragraph with 2 emojis and hashtags

4. FIRST COMMENT (1-2 sentences, fan-to-fan, documented fact + Tag a friend CTA)

5. SOURCE (name the actual documented source)

JSON:
{{"videos":[{{"videoScript":"...","images":[{{"num":1,"prompt":"..."}},{{"num":2,"prompt":"..."}},{{"num":3,"prompt":"..."}},{{"num":4,"prompt":"..."}},{{"num":5,"prompt":"..."}}{extra_images}],"captionAndHashtags":"...","firstComment":"...","pillar":"...","topics_used":"...","source":"..."}}]}}"""

        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-6','max_tokens':16000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=180
        )

        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout - please try again'}), 500
        if 'error' in result:
            return jsonify({'ok':False,'error':'API error: ' + str(result['error'].get('message', result['error']))}), 500
        if 'content' not in result:
            return jsonify({'ok':False,'error':'Unexpected API response: ' + str(result)[:200]}), 500

        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        data_out = json.loads(raw)
        videos = data_out.get('videos', [])
        return jsonify({'ok':True,'videos':videos,'videoType':video_type})

    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500

@mj_bp.route('/api/generate-carousel', methods=['POST'])
def generate_carousel():
    """Generate a 5-slide story carousel"""
    try:
        data       = request.get_json()
        override   = data.get('themeOverride', '').strip()
        exclusions = data.get('exclusions', [])

        # On This Day handler
        if override and override.lower() in ('on this day', 'on_this_day', 'otd'):
            otd = get_on_this_day()
            import datetime
            now = datetime.datetime.utcnow()
            date_str = now.strftime('%B %d')
            override = 'ON THIS DAY - %s: %s' % (date_str, otd['event'])

        story = pick_one_story(exclusions)
        angle = override if override else story['angle']

        system_prompt = (
            'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
            'You create 5-slide story carousels that tell one continuous, emotionally compelling narrative. '
            'CONTENT SOURCING RULES: '
            '1. Only reference facts documented in named interviews, publications, album credits, or verified sources. '
            '2. Never invent dialogue, quotes, or private moments. Never fill gaps with plausible detail. '
            '3. NEVER frame anything as mystery, lost, vault, or never released unless independently verifiable. '
            '4. Every slide draws from the same verified story angle - one cohesive narrative arc. '
            'CAROUSEL STRUCTURE: '
            'Slide 1 = Hook - has BOTH an image AND a longer caption (3-4 sentences). '
            'The caption sits BELOW the image (not overlaid) so it can be fuller and more descriptive. '
            'Use it to set up the whole story and hook the reader into swiping. '
            'Slides 2-4 = Story development - each has an image + SHORT 1-2 line overlay caption '
            'written to sit ON TOP of the image. Punchy, bold, readable at a glance. '
            'Slide 5 = Payoff + CTA - image + short overlay caption with emotional conclusion '
            'and a CTA asking viewers to follow MJ Uncovered. '
            'IMAGE STYLE - ALL 5 SLIDES get an image prompt (1080x1080 square). '
            'Rotate scene types across the 5 slides: music video recreation in correct era costume, '
            'dramatic stage performance, candid editorial moment, family scene, award show. '
            'Do not use recording studio more than once. '
            'State it is the real Michael Jackson. Anchor likeness to correct era with specific physical descriptors. MJ HAIR BY ERA: Jackson 5/early 70s = large Afro; Off The Wall (1979) = medium Afro; Thriller era (1982-84) = shoulder-length loosely curled black hair, NOT short cropped; Bad era (1987-89) = shoulder-length black curly hair; Dangerous/HIStory (1991-97) = long black curly hair past shoulders; Invincible/This Is It (2001-09) = medium-length black curly hair. NEVER short cropped hair.  '
            'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
        )


        user_prompt = f"""Create a 5-slide Facebook/Instagram carousel about this verified MJ story angle:

STORY ANGLE: {angle}

The carousel must tell ONE continuous narrative arc across all 5 slides - each slide builds on the last.

SLIDE STRUCTURE:

Slide 1 - HOOK (image + longer caption):
Write a bold scroll-stopping hook caption (3-4 sentences). This sits below/beside the image so it can be fuller.
Set up the story, introduce the subject, make them want to swipe for more.
Also write a detailed image prompt for Slide 1 (1080x1080 square, sets the visual tone for the whole carousel).

Slides 2, 3, 4 - STORY DEVELOPMENT (each needs image + overlay caption):
Each slide advances the narrative. Think of it as chapters in a short story.
For each: write a SHORT overlay caption (1-2 punchy lines, reads ON TOP of an image).
For each: write a detailed image prompt (1080x1080 square, specific scene, correct era, real MJ likeness).
Vary the scene type for each image - no two images should be the same type of scene.

Slide 5 - PAYOFF + CTA (image + overlay caption + follow CTA):
Deliver the emotional conclusion of the story.
End with a natural CTA: "Follow MJ Uncovered for more stories like this."
Write the overlay caption (include the CTA at the end).
Write a final image prompt.

Also generate:
- A single first comment (1-2 sentences, fan-to-fan voice, documented fact + "Tag a friend" CTA)
- topics_used: comma-separated specific topics referenced
- source: the actual named source for this story angle

JSON format:
{{"carousel": {{
  "slide1Caption": "...(3-4 sentence hook caption, sits below/beside image)...",
  "slide1ImagePrompt": "...(detailed 1080x1080 image prompt for slide 1)...",
  "slides": [
    {{"slideNum": 2, "overlayCaption": "...(1-2 lines, sits ON image)...", "imagePrompt": "..."}},
    {{"slideNum": 3, "overlayCaption": "...(1-2 lines, sits ON image)...", "imagePrompt": "..."}},
    {{"slideNum": 4, "overlayCaption": "...(1-2 lines, sits ON image)...", "imagePrompt": "..."}},
    {{"slideNum": 5, "overlayCaption": "...(1-2 lines + CTA to follow MJ Uncovered, sits ON image)...", "imagePrompt": "..."}}
  ],
  "firstComment": "...",
  "topics_used": "...",
  "source": "...",
  "pillar": "..."
}}}}"""

        try:
            resp = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
                json={'model':'claude-sonnet-4-6','max_tokens':4000,'system':system_prompt,
                      'messages':[{'role':'user','content':user_prompt}]},
                timeout=180
            )
        except requests.exceptions.Timeout:
            return jsonify({'ok':False,'error':'Request timed out - please try again'}), 500

        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok':False,'error':'Server timeout - please try again'}), 500
        if 'error' in result:
            return jsonify({'ok':False,'error':'API error: ' + str(result['error'].get('message', result['error']))}), 500
        if 'content' not in result:
            return jsonify({'ok':False,'error':'Unexpected API response: ' + str(result)[:200]}), 500

        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        data_out = json.loads(raw)
        return jsonify({'ok':True,'carousel':data_out['carousel']})

    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@mj_bp.route('/api/debug-storage', methods=['GET'])
def debug_storage():
    """Check volume storage status"""
    import traceback
    result = {
        'volume_path': VOLUME_PATH,
        'stories_file': STORIES_FILE,
        'used_file': USED_FILE,
        'volume_exists': os.path.exists(VOLUME_PATH),
        'stories_file_exists': os.path.exists(STORIES_FILE),
        'used_file_exists': os.path.exists(USED_FILE),
    }
    # Try writing a test file
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        test_file = os.path.join(VOLUME_PATH, 'test_write.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        result['can_write'] = True
    except Exception as e:
        result['can_write'] = False
        result['write_error'] = str(e)
    # Count used IDs
    try:
        used = load_used_ids()
        result['used_count'] = len(used)
    except Exception as e:
        result['used_count_error'] = str(e)
    # Count stories
    try:
        stories = load_stories()
        result['stories_count'] = len(stories)
    except Exception as e:
        result['stories_count_error'] = str(e)
    return jsonify(result)


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
    """Generate new story angles for ONE category per call - call repeatedly from frontend"""
    try:
        data = request.get_json() or {}
        category = data.get('category', '')
        target_count = int(data.get('count', 40))

        category_focuses = {
            "song_histories": "specific songs with chart performance (Billboard positions, dates), writing/production credits (named songwriters, producers, engineers), music video details (directors, notable scenes), and confirmed sample/cover history - all verifiable via Billboard, RIAA, and album liner notes",
            "family_history": "documented Jackson family history - the Gary Indiana origins, Motown years, the Jackson 5 formation, family members by name, documented moves and career transitions, all covered in The Jacksons: An American Dream, Moonwalk autobiography, and contemporary news coverage",
            "marriages_children": "publicly documented facts about MJ's marriages to Lisa Marie Presley and Debbie Rowe, his children Prince Paris and Blanket, and documented public statements/interviews - stick to widely reported facts only",
            "achievements_verified": "specific chart records, certifications (RIAA Gold/Platinum/Diamond), Grammy wins by category and year, Guinness World Records with verified figures, and major industry honors - only include if you can name the specific record/certification",
            "performances_verified": "specific major performances with confirmed dates and venues - televised specials, award shows, major tour openings/closings - things documented in news coverage and official tour records",
            "relationships_verified": "documented professional collaborations with named individuals - producers, songwriters, guitarists, directors, choreographers - and their specific documented contributions (album credits, video credits)",
        }

        if category not in category_focuses:
            return jsonify({'ok': False, 'error': f'Unknown category: {category}'}), 400

        all_stories = load_stories()
        existing_angles = [s['angle'] for s in all_stories if s['category'] == category]
        total_existing = len(all_stories)

        sample_existing = existing_angles[-60:] if len(existing_angles) > 60 else existing_angles
        existing_sample_str = '\n'.join([f'- {a[:80]}' for a in sample_existing])

        system_prompt = (
            'You are a Michael Jackson content researcher creating a database of FACTUAL angles for content creators. '
            'CRITICAL STANDARDS: '
            '1. Only generate angles tied to widely documented, easily verifiable facts - chart records, album credits, '
            'release dates, named collaborators with their documented contributions, major publicly reported events. '
            '2. Do NOT generate angles describing private moments, anecdotes, specific donations with dollar amounts, '
            'specific hospital visits, or any "behind the scenes" story unless it is something widely reported in major '
            'biographies or news coverage that a person could verify via a simple search. '
            '3. If you are not confident a fact is real and checkable, do not include it. '
            '4. Prefer angles about: song/album facts, chart performance, production credits, family/career history, '
            'major collaborations with named credits, and major verified achievements. '
            'Format: one sentence per angle, written so a content creator immediately knows what verifiable fact to write about. '
            'Respond ONLY with a JSON array of strings.'
        )

        user_prompt = f"""Generate exactly {target_count} new unique Michael Jackson story angles for category: {category.upper().replace('_', ' ')}

Focus on: {category_focuses[category]}

These must be COMPLETELY DIFFERENT from these existing angles (sample shown):
{existing_sample_str[:3000]}

Return ONLY a JSON array: ["angle 1", "angle 2", ...]"""

        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-6','max_tokens':4000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )

        try:
            result = resp.json()
        except Exception:
            return jsonify({'ok': False, 'error': 'Server timeout - please try again'}), 500
        if 'error' in result:
            return jsonify({'ok': False, 'error': 'API error: ' + str(result['error'].get('message', result['error']))}), 500
        if 'content' not in result:
            return jsonify({'ok': False, 'error': 'Unexpected API response: ' + str(result)[:200]}), 500

        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        angles = json.loads(raw)

        new_stories = []
        for angle in angles:
            if isinstance(angle, str) and len(angle) > 20:
                new_stories.append({
                    'id': f'{category}_r{total_existing + len(new_stories):04d}',
                    'category': category,
                    'angle': angle
                })

        if not new_stories:
            return jsonify({'ok': False, 'error': 'No new stories generated for this category'}), 500

        combined = all_stories + new_stories
        saved = save_stories(combined)

        return jsonify({
            'ok': True,
            'category': category,
            'new_count': len(new_stories),
            'total_count': len(combined),
            'saved_to_volume': saved
        })

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

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
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
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
.tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 20px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.tabs::-webkit-scrollbar{display:none;} .tab{white-space:nowrap;flex-shrink:0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
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
        &#10024; Generate New Story Angles
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
      <div class="tab" data-tab="shorts">Short Videos (30s)</div>
      <div class="tab" data-tab="longs">Long Videos (60s)</div>
      <div class="tab" data-tab="schedule">Schedule</div>
      <div class="tab" data-tab="carousel">Carousels</div>
    </div>

    <!-- CAROUSELS -->
    <div class="pane" id="pane-carousel">
      <div class="gen-box">
        <p>Generate a 5-slide story carousel — one continuous MJ narrative. Slide 1 gets an image prompt + longer hook caption below it. Slides 2-5 each get an image prompt + short overlay caption to place on the image. Slide 5 includes a CTA.</p>
        <div style="margin-bottom:12px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--hint);text-transform:uppercase;">SPECIFIC TOPIC <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
          <select id="carousel-override" style="width:100%;background:var(--dark2);border:1px solid var(--dark3);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);font-family:DM Sans,sans-serif;margin-top:4px;box-sizing:border-box;">
            <option value="">— Random (recommended) —</option>
            <option value="on_this_day">📅 On This Day</option>
          </select>
        </div>
        <button class="btn btn-gold" id="carousel-btn" onclick="generateCarousel()">Generate Carousel</button>
      </div>
      <div id="carousel-results" style="padding:16px;"></div>
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
          
            <option value="on_this_day">📅 On This Day</option>
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
          
            <option value="on_this_day">📅 On This Day</option>
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
          
            <option value="on_this_day">📅 On This Day</option>
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
          
            <option value="on_this_day">📅 On This Day</option>
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
    music_videos: "Iconic music videos - breakdowns, cultural impact, and the creative process behind Thriller, Beat It, Billie Jean, Black or White, Smooth Criminal",
    albums: "Album deep dives - Off the Wall, Thriller, Bad, Dangerous, HIStory, Invincible: recording process, collaborators, chart performance",
    performances: "Live performances and concert tours - Victory Tour, Bad Tour, Dangerous Tour, HIStory Tour, This Is It",
    dance: "Dance - the moonwalk debut on Motown 25 (May 16 1983), signature moves, choreography evolution, influence on dancers",
    fashion: "Fashion evolution - documented iconic outfits, the red jacket, military jackets, fedora, single glove, designer collaborations",
    collaborations: "Collaborations with legendary artists - Paul McCartney, Quincy Jones, Siedah Garrett, Eddie Van Halen, and others",
    humanitarian: "Humanitarian work - Heal the World Foundation, We Are the World, documented charity contributions",
    rare: "Rare and lesser-known documented moments - confirmed public appearances, documented interviews, publicly recorded events",
    influence: "Influence on modern artists - documented tributes, confirmed statements about MJ's influence on contemporary music",
    fans: "Fan stories and community - the global fan community, documented fan events, enduring connection with his audience",
    records: "Record-breaking achievements - Billboard chart records, Grammy wins, Thriller as best-selling album, Guinness World Records",
    making_of: "The making of specific songs - documented studio stories, confirmed creative process details, iconic tracks"
  };

const S = {
  bufferToken: localStorage.getItem('mj_buffer') || '',
  profileIds: (localStorage.getItem('mj_profiles') || '').split(',').filter(Boolean),
  geminiKey: localStorage.getItem('mj_gemini') || '',
  tone: 'cinematic', cta: 'engagement',
  imagePosts: [], banners: [], shortVideos: [], longVideos: [], carousels: []
};

// -- PERSISTENCE -------------------------------------------
function savePosts() {
  try {
    localStorage.setItem('mj_imagePosts', JSON.stringify(S.imagePosts));
    localStorage.setItem('mj_banners', JSON.stringify(S.banners));
    localStorage.setItem('mj_shortVideos', JSON.stringify(S.shortVideos));
    localStorage.setItem('mj_longVideos', JSON.stringify(S.longVideos));
    localStorage.setItem('mj_carousels', JSON.stringify(S.carousels));
  } catch(e) { console.warn('Save error:', e); }
}
function loadPosts() {
  try {
    const ip = localStorage.getItem('mj_imagePosts');
    const bn = localStorage.getItem('mj_banners');
    const sv = localStorage.getItem('mj_shortVideos');
    const lv = localStorage.getItem('mj_longVideos');
    const cr = localStorage.getItem('mj_carousels');
    if (ip) S.imagePosts = JSON.parse(ip);
    if (bn) S.banners = JSON.parse(bn);
    // Only load videos if they have new format (images array)
    if (sv) { const svp = JSON.parse(sv); if (svp.length && svp[0].images) S.shortVideos = svp; }
    if (lv) { const lvp = JSON.parse(lv); if (lvp.length && lvp[0].images) S.longVideos = lvp; }
    if (cr) S.carousels = JSON.parse(cr);
  } catch(e) { console.warn('Load error:', e); }
}

// -- INIT --------------------------------------------------
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
    try {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
      tab.classList.add('on');
      const pane = document.getElementById('pane-' + tab.dataset.tab);
      if (pane) pane.classList.add('on');
    } catch(e) { console.error('Tab error:', e); }
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

// -- HELPERS -----------------------------------------------
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
  catch(e) { toast('Copy failed - long press text to copy', true); }
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

// -- GENERATE IMAGE POSTS ----------------------------------

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
    override = override ? override + ' - specifically: ' + topic : topic;
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
      renderImagePosts(); updateStats(); renderSchedule(); refreshStoryStats();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('img-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate Image Posts';
}

// -- GENERATE BANNERS --------------------------------------
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
      renderBanners(); updateStats(); renderSchedule(); refreshStoryStats();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('banner-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 Banners';
}

// -- GENERATE VIDEOS ---------------------------------------
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
      renderVideos(type); updateStats(); renderSchedule(); refreshStoryStats();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById(type+'-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 '+(type==='short'?'Short':'Long')+' Scripts';
}

// -- CARD BUILDER ------------------------------------------
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
    +(item.source ? '<div style="margin-top:6px;padding:5px 10px;background:rgba(201,168,76,.06);border-radius:4px;border-left:2px solid var(--gold-dim);"><span style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);">Source </span><span style="font-size:11px;color:var(--muted);">'+esc(item.source||'')+'</span></div>' : '')
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
      item.videoScript, item.captionAndHashtags, item.firstComment, 'Narration Script', 'Caption & Hashtags');
  }
}

// -- RENDER FUNCTIONS --------------------------------------
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

function buildImgPromptsBlock(container, imgs) {
  var header = document.createElement("div");
  header.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:10px;";
  header.textContent = imgs.length + " IMAGE PROMPTS - 9:16 for Seedance/Kling";
  container.appendChild(header);
  imgs.forEach(function(img) {
    var wrap = document.createElement("div");
    wrap.style.marginBottom = "10px";
    var label = document.createElement("div");
    label.style.cssText = "font-size:9px;font-weight:700;color:var(--gold);margin-bottom:3px;";
    label.textContent = "IMAGE " + img.num;
    var text = document.createElement("div");
    text.style.cssText = "font-size:12px;color:var(--muted);line-height:1.6;font-style:italic;margin-bottom:4px;";
    text.textContent = img.prompt || "";
    var copyBtn = document.createElement("button");
    copyBtn.className = "mbtn";
    copyBtn.style.fontSize = "10px";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", function() {
      var t = img.prompt || "";
      if (navigator.clipboard) { navigator.clipboard.writeText(t).then(function() { copyBtn.textContent = "Copied!"; setTimeout(function() { copyBtn.textContent = "Copy"; }, 1500); }); }
      else { showCopyModal(t); }
    });
    wrap.appendChild(label);
    wrap.appendChild(text);
    wrap.appendChild(copyBtn);
    container.appendChild(wrap);
  });
  var allText = imgs.map(function(img) { return "Image " + img.num + ":\n" + (img.prompt || ""); }).join("\n\n");
  var copyAllBtn = document.createElement("button");
  copyAllBtn.className = "mbtn";
  copyAllBtn.style.cssText = "border:1px solid var(--gold-dim);color:var(--gold);font-size:10px;margin-top:4px;";
  copyAllBtn.textContent = "Copy All " + imgs.length + " Prompts";
  copyAllBtn.addEventListener("click", function() {
    if (navigator.clipboard) { navigator.clipboard.writeText(allText).then(function() { copyAllBtn.textContent = "Copied!"; setTimeout(function() { copyAllBtn.textContent = "Copy All " + imgs.length + " Prompts"; }, 1500); }); }
    else { showCopyModal(allText); }
  });
  container.appendChild(copyAllBtn);
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
    const typeLabel = type==='short'?'SHORT 30s':'LONG 60s';
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '8px';
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = type+'-card-'+i;
    card.innerHTML = buildCardHTML(type, i, v, fmtTime(addMins(start, (baseOff+i)*intv)), typeLabel, typeCls);
    wrapper.appendChild(card);
    // Append image prompts block below card
    var imgs = (v.images || []);
    if (imgs.length) {
      var imgDiv = document.createElement("div");
      imgDiv.style.cssText = "background:var(--dark2);border:1px solid var(--dark3);border-top:none;border-radius:0 0 10px 10px;padding:12px 16px;margin-bottom:4px;";
      buildImgPromptsBlock(imgDiv, imgs);
      wrapper.appendChild(imgDiv);
    }
    list.appendChild(wrapper);
  });
  container.appendChild(list);
}

// -- IMAGE UPLOAD & GENERATION -----------------------------
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

// -- CLEAR CONTENT -----------------------------------------
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

// -- SCHEDULE VIEW -----------------------------------------
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


// -- MOBILE MENU -------------------------------------------
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


// -- COPY MODAL --------------------------------------------
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


// -- TOPIC TRACKER -----------------------------------------
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



// -- CAROUSEL ----------------------------------------------
async function generateCarousel() {
  const btn = document.getElementById('carousel-btn');
  const results = document.getElementById('carousel-results');
  const override = (document.getElementById('carousel-override') || {}).value || '';

  btn.disabled = true;
  btn.textContent = 'Generating...';
  results.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0;text-align:center;">Building your 5-slide story... ~30-60 seconds</div>';

  try {
    const res = await fetch('/mj/api/generate-carousel', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ themeOverride: override.trim(), exclusions: getTopicHistory() })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    const c = data.carousel;
    if (c.topics_used) addTopicsToHistory([{topics_used: c.topics_used, pillar: c.pillar || ""}]);
    S.carousels.unshift(c);
    savePosts();
    renderCarousels();

    renderCarousels();
    refreshStoryStats();

  } catch(e) {
    results.innerHTML = `<div style="color:#D48A8A;font-size:13px;padding:16px;">Error: ${esc(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Carousel';
  }
}

function renderCarousels() {
  const results = document.getElementById('carousel-results');
  if (!results) return;
  if (!S.carousels || !S.carousels.length) {
    results.innerHTML = '';
    return;
  }

  let out = '';

  S.carousels.forEach((c, ci) => {
    const goldBorder = '1px solid var(--gold-dim)';
    const dimBorder  = '1px solid var(--dark3)';

    function slideCard(label, captionLabel, caption, imgPrompt, borderColor, note) {
      return `<div style="background:var(--dark2);border:${borderColor};border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:${borderColor===goldBorder?'var(--gold)':'var(--hint)'};text-transform:uppercase;margin-bottom:10px;">${label}</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;">${captionLabel}</div>
          <div style="font-size:14px;color:var(--text);line-height:1.6;">${esc(caption||'')}</div>
          ${note?`<div style="font-size:10px;color:var(--hint);margin-top:4px;">${note}</div>`:''}
          <button onclick="carouselCopy(this)" data-copy="${esc(caption||'')}" style="margin-top:6px;background:var(--dark3);border:none;border-radius:4px;padding:4px 10px;font-size:10px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">Copy Caption</button>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;">Image Prompt</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;font-style:italic;">${esc(imgPrompt||'')}</div>
          <button onclick="carouselCopy(this)" data-copy="${esc(imgPrompt||'')}" style="margin-top:6px;background:var(--dark3);border:none;border-radius:4px;padding:4px 10px;font-size:10px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">Copy Image Prompt</button>
        </div>
      </div>`;
    }

    out += `<div style="border:1px solid var(--dark3);border-radius:12px;padding:16px;margin-bottom:20px;background:var(--dark1);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;">Carousel ${S.carousels.length - ci}</span>
        <button onclick="deleteCarousel(${ci})" style="background:none;border:1px solid var(--dark3);border-radius:4px;padding:3px 8px;font-size:10px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">x Remove</button>
      </div>`;

    out += slideCard('Slide 1 - Hook', 'Caption (sits below image)', c.slide1Caption||'', c.slide1ImagePrompt||'', goldBorder, 'Caption goes below/beside the image - not on top');

    (c.slides||[]).forEach(slide => {
      const isLast = slide.slideNum === 5;
      out += slideCard(
        `Slide ${slide.slideNum}${isLast?' - Payoff + CTA':' - Story'}`,
        'Overlay Caption (sits ON TOP of image)',
        slide.overlayCaption||'', slide.imagePrompt||'',
        isLast ? goldBorder : dimBorder, null
      );
    });

    if (c.firstComment) {
      out += `<div style="background:rgba(201,168,76,.06);border:1px solid var(--gold-dim);border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;">First Comment</div>
        <div style="font-size:13px;color:var(--muted);">${esc(c.firstComment)}</div>
        <button onclick="carouselCopy(this)" data-copy="${esc(c.firstComment)}" style="margin-top:6px;background:var(--dark3);border:none;border-radius:4px;padding:4px 10px;font-size:10px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">Copy</button>
      </div>`;
    }
    if (c.source) {
      out += `<div style="padding:5px 10px;background:rgba(201,168,76,.06);border-radius:4px;border-left:2px solid var(--gold-dim);"><span style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);">Source </span><span style="font-size:11px;color:var(--muted);">${esc(c.source)}</span></div>`;
    }

    out += '</div>';
  });

  // Add clear all button
  out += `<div style="text-align:center;margin-top:8px;">
    <button onclick="clearCarousels()" style="background:none;border:1px solid var(--dark3);border-radius:6px;padding:8px 20px;font-size:12px;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">Clear All Carousels</button>
  </div>`;

  results.innerHTML = out;
}

function deleteCarousel(idx) {
  S.carousels.splice(idx, 1);
  savePosts();
  renderCarousels();
}

function clearCarousels() {
  if (!confirm('Clear all saved carousels?')) return;
  S.carousels = [];
  savePosts();
  renderCarousels();
}

function quickCopy(btn, text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    }).catch(() => showCopyModal(text));
  } else { showCopyModal(text); }
}

function carouselCopy(btn) {
  const text = btn.getAttribute('data-copy');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    }).catch(() => showCopyModal(text));
  } else {
    showCopyModal(text);
  }
}

// -- STORY DATABASE -----------------------------------------
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
      <div style="font-size:10px;color:var(--hint);">${pct}% used . ~${data.days_remaining} days remaining</div>
    `;
    if (el) el.innerHTML = counterHTML;
    if (settingsEl) settingsEl.innerHTML = `${data.total} stories total . ${data.used} used . ${data.unused} remaining . ~${data.days_remaining} days at 15 posts/day`;
  } catch(e) {
    if (el) el.innerHTML = '<span style="color:var(--hint)">Stats unavailable</span>';
  }
}

async function runStoryRefresh() {
  const btn = document.getElementById('refresh-stories-btn');
  const status = document.getElementById('refresh-status');
  if (!btn || !status) return;

  const categories = [
    {key:'song_histories', count:60, label:'Song Histories'},
    {key:'family_history', count:40, label:'Family History'},
    {key:'marriages_children', count:30, label:'Marriages & Children'},
    {key:'achievements_verified', count:30, label:'Achievements'},
    {key:'performances_verified', count:30, label:'Performances'},
    {key:'relationships_verified', count:30, label:'Relationships'},
  ];

  btn.disabled = true;
  status.style.display = 'block';
  status.style.color = 'var(--gold)';

  let totalAdded = 0;
  let finalTotal = 0;
  let errors = [];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    btn.textContent = `Generating ${cat.label}... (${i+1}/${categories.length})`;
    status.textContent = `Working on ${cat.label} (${i+1} of ${categories.length}) - this may take 30-60 seconds per category`;

    try {
      const res = await fetch('/mj/api/refresh-stories', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({category: cat.key, count: cat.count})
      });
      const data = await res.json();
      if (data.ok) {
        totalAdded += data.new_count;
        finalTotal = data.total_count;
        refreshStoryStats();
      } else {
        errors.push(`${cat.label}: ${data.error}`);
      }
    } catch(e) {
      errors.push(`${cat.label}: ${e.message}`);
    }
  }

  if (totalAdded > 0) {
    status.textContent = `Added ${totalAdded} new stories. Database now has ${finalTotal} total.` + (errors.length ? ` (${errors.length} category issue(s) - check console)` : '');
    status.style.color = '#1D9E75';
    btn.textContent = `v ${finalTotal} stories now available`;
    if (errors.length) console.warn('Refresh issues:', errors);
    toast(`Added ${totalAdded} new story angles`);
  } else {
    status.textContent = 'No new stories were added. Errors: ' + errors.join('; ');
    status.style.color = '#D48A8A';
    btn.disabled = false;
    btn.textContent = '<> Generate New Story Angles';
  }
}

// Load stats on page init
setTimeout(refreshStoryStats, 1000);

// -- VIDEO IMAGE PROMPT COPY --------------------------------
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('vid-copy-prompt')) {
    const text = decodeURIComponent(e.target.getAttribute('data-prompt') || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var orig = e.target.textContent;
        e.target.textContent = 'Copied!';
        setTimeout(function() { e.target.textContent = orig; }, 1500);
      }).catch(function() { showCopyModal(text); });
    } else { showCopyModal(text); }
  }
  if (e.target.classList.contains('vid-copy-all')) {
    const text = decodeURIComponent(e.target.getAttribute('data-prompts') || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        var orig = e.target.textContent;
        e.target.textContent = 'Copied!';
        setTimeout(function() { e.target.textContent = orig; }, 1500);
      }).catch(function() { showCopyModal(text); });
    } else { showCopyModal(text); }
  }
});

// -- LOAD SAVED POSTS ON INIT ------------------------------
loadPosts();
if (S.imagePosts.length) { renderImagePosts(); updateStats(); renderSchedule(); refreshStoryStats(); }
if (S.banners.length) { renderBanners(); updateStats(); renderSchedule(); refreshStoryStats(); }
if (S.shortVideos.length) renderVideos('short');
if (S.longVideos.length) renderVideos('long');
if (S.carousels && S.carousels.length) renderCarousels();
updateStats();
setTimeout(refreshStoryStats, 1000);
</script>
</body>
</html>
'''
