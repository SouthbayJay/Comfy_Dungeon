(async (window, d, undefined) => {
    const _ = (selector, contex=d) => contex.querySelector(selector);

    let startTime;
    function timerStart() { startTime = new Date(); }
    function elapsedTime() { if (!startTime) return 0; return (new Date() - startTime) / 1000; }

    function seed () { return Math.floor(Math.random() * 9999999999); }

    function toggleDisplay(el, value=null) {
        if (value !== null) {
            el.style.display = (value === true) ? '' : 'none';
            return;
        }

        el.style.display = (el.style.display === 'none') ? '' : 'none';
    }

    // Seeded random number generator
    function seededRandom(a) {
        return function() {
          a |= 0; a = a + 0x9e3779b9 | 0;
          var t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
              t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
          return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
        }
    }

    // UUID generator
    function uuidv4() { return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); }

    // Preload all API workflows
    async function load_api_workflows() {
        let wf = {
            'basic_portrait': '/dungeon/js/basic_portrait.json',
            'basic_portrait_lcm': '/dungeon/js/basic_portrait_lcm.json',
        }

        for (let key in wf) {
            let response = await fetch(wf[key]);
            wf[key] = await response.json();
        }
        console.log("Loaded workflows:", wf); // Debug log
        return wf;
    }
    const workflows = await load_api_workflows();

    // Get the the installed Checkpoints    
    async function get_checkpoints() {
        let response = await fetch('object_info/CheckpointLoaderSimple', {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        response = await response.json();
        let checkpoints = response['CheckpointLoaderSimple']['input']['required']['ckpt_name'][0];
        const checkpoints_regex = {
            'FluxSchnell': /.*flux.*schnell.*fp8\.safetensors$/gi,
            'ProteusV0.3': /.*proteus.*0\.3.*\.safetensors$/gi,
        };
        let available_checkpoints = {};
    
        for (let key in checkpoints_regex) {
            available_checkpoints[key] = '';

            checkpoints.forEach(ckpt => {
                if (checkpoints_regex[key].test(ckpt)) {
                    available_checkpoints[key] = ckpt;
                }
            });
        }

        return available_checkpoints;
    };
    const available_checkpoints = await get_checkpoints();

    const positive_template = "{{SETTING}} {{STYLE}} closeup of a {{AGE}} {{BODY}}{{ETHNICITY}}{{RACE}} {{GENDER}} {{CLASS}}{{HAIR_COLOR}}{{HAIRSTYLE}}{{GEAR}}.{{RACE_HELPER}}{{BACKGROUND}} High quality, detailed, high resolution{{SETTING_HELPER}}.{{MOOD}}{{ATMOSPHERE}}";
   // const negative_template = "{{STYLE}}{{RACE}}rendering, blurry, noisy, deformed, text, {{GENDER}}scars, blood, dirty, nipples, naked, boobs, cleavage, face mask, Christmas, garden, zippers, ill, lazy eye, {{BACKGROUND}} author, signature, 3d";

    const ethnicities = {
        "1": ["Eritrean", "Djiboutian", "Ethiopian", "Somali", "Kenyan", "Ugandan", "Rwandan", "Burundian", "Tanzanian", "Malagasy", "Mauritian", "Seychellois"],
        "2": ["Chadian", "Sudanese", "Central African", "Cameroonian", "Gabonese", "Equatorial Guinean", "Sao Tomean", "Angolan", "Congolese", "Zambian", "Malawian", "Mozambican", "Madagascan", "Comorian", "Mauritian", "Seychellois"],
        "3": ["Egyptian", "Libyan", "Tunisian", "Algerian", "Moroccan", "Mauritanian", "Sahrawi", "Tuareg"],
        "4": ["Namibian", "South African", "Botswanan", "Zimbabwean", "Zambian", "Malawian", "Mozambican", "Swazi", "Lesotho", "Basotho"],
        "5": ["Mauritanian", "Senegalese", "Malian", "Nigerien", "Burkinabe", "Ivorian", "Ghanaian", "Togolese", "Beninese", "Nigerian", "Cameroonian", "Equatorial Guinean", "Sao Tomean", "Gabonese", "Congolese"],

        "6": ["Belizean", "Costa Rican", "Salvadoran", "Guatemalan", "Honduran", "Nicaraguan", "Panamanian"],
        "7": ["Antiguan", "Bahamian", "Barbadian", "Cuban", "Dominican", "Dominican", "Grenadian", "Haitian", "Jamaican", "Kittian and Nevisian", "Lucian", "Vincentian", "Trinidadian and Tobagonian"],
        "8": ["Argentine", "Bolivian", "Brazilian", "Chilean", "Colombian", "Ecuadorian", "Guyanese", "Paraguayan", "Peruvian", "Surinamese", "Uruguayan", "Venezuelan"],

        "9": ["Kazakhstani", "Kyrgyzstani", "Tajikistani", "Turkmen", "Uzbekistani"],
        "10": ["Chinese", "Japanese", "Korean", "Mongolian", "Taiwanese"],
        "11": ["Bangladeshi", "Bhutanese", "Indian", "Maldivian", "Nepalese", "Pakistani", "Sri Lankan"],
        "12": ["Burmese", "Cambodian", "Filipino", "Indonesian", "Laotian", "Malaysian", "Singaporean", "Thai", "Timorese", "Vietnamese"],
        "13": ["Afghan", "Armenian", "Azerbaijani", "Bahraini", "Cypriot", "Georgian", "Iranian", "Iraqi", "Israeli", "Jordanian", "Kuwaiti", "Lebanese", "Omani", "Palestinian", "Qatari", "Saudi", "Syrian", "Turkish", "Emirati", "Yemeni"],

        "14": ["Australian", "Fijian", "I-Kiribati", "Marshallese", "Micronesian", "Nauruan", "New Zealander", "Palauan", "Papua New Guinean", "Samoan", "Solomon Islander", "Tongan", "Tuvaluan", "Vanuatuan"],

        "15": ["Belarusian", "Bulgarian", "Czech", "Hungarian", "Polish", "Moldovan", "Romanian", "Russian", "Slovak", "Ukrainian"],
        "16": ["Estonian", "Latvian", "Lithuanian"],
        "17": ["Albanian", "Bosnian", "Croatian", "Greek", "Italian", "Maltese", "Montenegrin", "North Macedonian", "Portuguese", "Serbian", "Slovenian", "Spanish"],
        "18": ["Austrian", "Belgian", "Dutch", "French", "German", "Liechtensteiner", "Luxembourger", "Monacan", "Swiss"],
        "19": ["Icelandic", "Irish", "Manx", "British"],

        "21": ["Fijian", "Papua New Guinean", "Solomon Islander", "Vanuatuan", "Kiribati", "Marshallese", "Micronesian", "Nauruan", "Palauan", "Samoan", "Tongan", "Tuvaluan"],
    }

    // Queue a prompt
    async function queue_prompt(prompt = {}) {
        const data = { 'prompt': prompt, 'client_id': client_id };

        const response = await fetch('/prompt', {
            method: 'POST',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    }

    // Interrupt the generation
    async function interrupt() {
        const response = await fetch('/interrupt', {
            method: 'POST',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/html'
            },
        });

        //return await response.json();
    }

    const client_id = uuidv4();
    const server_address = window.location.hostname + ':' + window.location.port;

    // Current status
    let IS_GENERATING = false;

    // HTML elements
    const roll = _('#roll');
    const roll_icon = _('#roll-icon');
    const progressbar = _('#main-progress');
    const seed_input = _('#main-seed');
    const is_random_input = _('#is-random');
    const spinner = _('#main-spinner');
    const modal = _('#app-modal');
    const results = _('#results');

    const quality_input = _('#quality-input');
    const batch_size_input = _('#batch-size-input');
    const style_input = _('#style-input');
    const setting_input = _('#setting-input');
    const body_structure_input = _('#body-structure-input');
    const race_input = _('#race-input');
    const age_input = _('#age-input');
    const gender_input = _('#gender-input');
    const class_input = _('#class-input');
    const gear_input = _('#gear-input');
    const hairstyle_input = _('#hairstyle-input');
    const haircolor_input = _('#haircolor-input');
    const background_input = _('#background-input');
    const mood_input = _('#mood-input');
    const atmosphere_input = _('#atmosphere-input');
    const ethnicity_input = _('#ethnicity-input');
    const custom_input = _('#custom-input');
    
    function updateProgress(max=0, value=0) { progressbar.max = max; progressbar.value = value; }

    // Event listeners
    roll.addEventListener('click', async (event) => {
        if (IS_GENERATING) {
            await interrupt();
            return;
        }

        console.log("Roll button clicked, starting generation..."); // Debug: Button click event tracked

        IS_GENERATING = true;
        toggleDisplay(spinner, IS_GENERATING);
        toggleDisplay(roll_icon, !IS_GENERATING);
        
        try {
            let wf = structuredClone(workflows['basic_portrait']);
            let model = style_input.options[style_input.selectedIndex].value;
            console.log("Selected model:", model); // Debug log

            // Process model flags
            let is_cinematic = model.includes('-Cinematic');
            let is_anime = model.includes('-Anime');
            let is_LCM = model.includes('-LCM');
            let is_Turbo = model.includes('Turbo');

            // Clean up model name
            model = model
                .replace('-LCM', '')
                .replace('-Anime', '')
                .replace('-Cinematic', '')
                .replace('Turbo', '');

            console.log("Cleaned model name:", model); // Debug log
            console.log("Available checkpoints:", available_checkpoints); // Debug log
            console.log("Setting input value:", setting_input ? setting_input.value : "undefined");
            console.log("Age input value:", age_input ? age_input.value : "undefined");
            console.log("Body structure value:", body_structure_input ? body_structure_input.value : "undefined");

            // Verify checkpoint exists
            if (!available_checkpoints[model]) {
                throw new Error(`Checkpoint not found for model: ${model}`);
            }

            // Set the checkpoint
            wf['30']['inputs']['ckpt_name'] = available_checkpoints[model];
            
            // Set default parameters
            let base_steps = 4;        
            let step_increment = 8;    
            let sampler_name = 'euler';
            let scheduler = 'beta';
            let CFG = 1;

            // Get random seed if needed
            let rndseed = is_random_input.checked ? seed() : parseInt(seed_input.value);
            console.log("Using seed:", rndseed); // Debug log

            // Update workflow parameters
            wf['31']['inputs']["sampler_name"] = sampler_name;
            wf['31']['inputs']["scheduler"] = scheduler;    
            wf['31']['inputs']['seed'] = rndseed;
            wf['31']['inputs']['steps'] = base_steps + Math.round(quality_input.value * step_increment);
            wf['31']['inputs']['cfg'] = CFG;
            wf['27']['inputs']['batch_size'] = batch_size_input.value;

            // Process prompts
            let positive = positive_template;
           // let negative = negative_template;
            
            // Replacement values
            const replacements = {
                '{{SETTING}}': setting_input ? setting_input.value : "undefined",
                '{{AGE}}': age_input ? age_input.value : "undefined",
                '{{BODY}}': body_structure_input ? body_structure_input.value : "undefined",
                '{{GENDER}}': gender_input ? (gender_input.value == 1 ? 'female' : 'male') : "undefined",
                '{{RACE}}': race_input ? race_input.value : "undefined",
                '{{ETHNICITY}}': ethnicity_input ? ethnicity_input.options[ethnicity_input.selectedIndex].text : "",
                '{{CLASS}}': class_input ? class_input.value : "undefined",
                '{{HAIR_COLOR}}': haircolor_input ? haircolor_input.value : "",
                '{{HAIRSTYLE}}': hairstyle_input ? hairstyle_input.value : "",
                '{{GEAR}}': gear_input ? gear_input.value : "",
                '{{BACKGROUND}}': background_input ? background_input.value : "",
                '{{MOOD}}': mood_input ? mood_input.value : "",
                '{{ATMOSPHERE}}': atmosphere_input ? atmosphere_input.value : ""
            };

            // Replace all placeholders, ensuring proper spacing around values
            for (let key in replacements) {
                positive = positive.replace(new RegExp(key, 'g'), ` ${replacements[key]} `);
           //     negative = negative.replace(new RegExp(key, 'g'), ` ${replacements[key]} `);
            }

            // Remove any extra spaces that might be added inadvertently
            positive = positive.replace(/\s+/g, ' ').trim();
          //  negative = negative.replace(/\s+/g, ' ').trim();

            // Set style based on flags
            let style = is_cinematic ? 'film still cinematic photo' :
                       is_anime ? 'anime illustration' :
                       'illustration digital painting';
            let negative_style = is_cinematic ? 'illustration, anime, cosplay, ' :
                                is_anime ? 'photo, fanart, ' :
                                'photo, anime, ';

            positive = positive.replace(/{{STYLE}}/g, style);
         //   negative = negative.replace(/{{STYLE}}/g, negative_style);

            // Set the prompts in workflow
            wf['6']['inputs']['text'] = positive;
       //     wf['33']['inputs']['text'] = negative;

            console.log("Constructed positive prompt:", positive); // Debug: Constructed prompt output
           // console.log("Constructed negative prompt:", negative); // Debug: Constructed negative prompt

            console.log("Attempting to queue the prompt..."); // Debug: Before queuing

            console.log("Final workflow before queue:", wf); // Debug log

            // Queue the prompt
            timerStart();
            const response = await queue_prompt(wf);

            if ('error' in response) {
                throw new Error(response.error.message);
            }

        } catch (error) {
            console.error("Generation error:", error);
            IS_GENERATING = false;
            toggleDisplay(spinner, IS_GENERATING);
            toggleDisplay(roll_icon, !IS_GENERATING);
            updateProgress();
            _('#modal-message').innerHTML = error.message;
            UIkit.modal(modal).show();
        }
    });

    is_random_input.addEventListener('change', (event) => {
        if (is_random_input.checked) {
            seed_input.disabled = true;
        } else {
            seed_input.disabled = false;
        }
    });

    // WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(protocol + '//' + server_address + '/ws?clientId=' + client_id);
    socket.addEventListener('open', (event) => {
        console.log('Connected to the server');
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        if ( data.type === 'progress' ) {
            //IS_GENERATING = true;
            updateProgress(data['data']['max'], data['data']['value']);
        } else if (data.type === 'executed') {
            const execution_time = elapsedTime();
            console.log('Execution time: ' + execution_time + 's');
            if ('images' in data['data']['output']) {
                results.innerHTML = '';
                const images = data['data']['output']['images'];
                const grid = ( images.length > 1 ) ? ' class="uk-width-1-2"' : '';
                for (let i = 0; i < images.length; i++) {
                    const filename = images[i]['filename']
                    const subfolder = images[i]['subfolder']
                    const rand = Math.random();
                    results.innerHTML += '<div' + grid + '><div><a href="/view?filename=' + filename + '&type=output&subfolder=' + subfolder + '&rand=' + rand + '" data-type="image"><img src="/view?filename=' + filename + '&type=output&subfolder=' + subfolder + '&rand=' + rand + '" width="1024" height="1024" alt=""></a></div></div>';
                }
            }
        } else if (data.type === 'execution_interrupted') {
            console.log('Execution Interrupted');
        } else if (data.type === 'status') {
            IS_GENERATING = (data['data']['status']['exec_info']['queue_remaining'] > 0) ? true : false;

            toggleDisplay(spinner, IS_GENERATING)
            toggleDisplay(roll_icon, !IS_GENERATING)
            updateProgress();
        }
    });

})(window, document, undefined);
