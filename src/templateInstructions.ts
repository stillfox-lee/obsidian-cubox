export const getInstructionUrl = (domain: string, type: string): string => {
    if (domain === 'cubox.pro') {
        switch(type) {
            case 'filename':
                return 'https://help.cubox.pro/share/obplugin/#%E6%96%87%E4%BB%B6%E5%90%8D%E6%A8%A1%E6%9D%BF';
            case 'metadata':
                return 'https://help.cubox.pro/share/obplugin/#%E5%85%83%E5%B1%9E%E6%80%A7';
            case 'content':
                return 'https://help.cubox.pro/share/obplugin/#%E5%86%85%E5%AE%B9%E6%A8%A1%E6%9D%BF';
            case 'date':
                return 'https://help.cubox.pro/share/obplugin/#%E6%97%A5%E6%9C%9F%E6%A0%BC%E5%BC%8F';
            default:
                return '#';
        }
    } else if (domain === 'cubox.cc') {
        switch(type) {
            case 'filename':
                return 'https://help.cubox.cc/share/obplugin/#filename-template';
            case 'metadata':
                return 'https://help.cubox.cc/share/obplugin/#metadata';
            case 'content':
                return 'https://help.cubox.cc/share/obplugin/#content-template';
            case 'date':
                return 'https://help.cubox.cc/share/obplugin/#date-format';
            default:
                return '#';
        }
    }
    return '#';
};

export const getReferenceLink = (domain: string, type: string): string => {
    // Default link when no domain is selected
    if (!domain) {
        return '<div class="cubox-reference">For more, refer to <a href="#" class="reference-link">reference</a>.</div>';
    }
    
    const url = getInstructionUrl(domain, type);
    return `<div class="cubox-reference">For more, refer to <a href="${url}" class="reference-link" target="_blank">reference</a>.</div>`;
};

// Placeholder functions that will be replaced with actual implementations that use the domain
export let getFilenameReferenceLink = (domain: string) => getReferenceLink(domain, 'filename');
export let getMetadataReferenceLink = (domain: string) => getReferenceLink(domain, 'metadata');
export let getContentReferenceLink = (domain: string) => getReferenceLink(domain, 'content');
export let getDateReferenceLink = (domain: string) => getReferenceLink(domain, 'date');

export const filenameTemplateInstructions = `
Enter template for creating synced article file name.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>{{{title}}}</li>
        <li>{{{article_title}}}</li>
        <li>{{{create_time}}}</li>
        <li>{{{update_time}}}</li>
        <li>{{{domain}}}</li>
        <li>{{{type}}}</li>
    </ul>
    <div class="cubox-reference domain-reference-filename"></div>
</div>
`;

export const metadataVariablesInstructions = `
Enter the metadata separated by comma. you can also use custom aliases in the format of metadata::alias. For syncing purposes, the id will always be included.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>title</li>
        <li>article_title</li>
        <li>tags</li>
        <li>create_time</li>
        <li>update_time</li>
        <li>domain</li>
        <li>url</li>
        <li>cubox_url</li>
        <li>description</li>
        <li>words_count</li>
        <li>type</li>
    </ul>
    <div class="cubox-reference domain-reference-metadata"></div>
</div>
`;

export const contentTemplateInstructions = `
Enter template for creating synced article content.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Available variables</div>
    <ul class="cubox-variables-list">
        <li>{{{id}}}</li>
        <li>{{{title}}}</li>
        <li>{{{description}}}</li>
        <li>{{{article_title}}}</li>
        <li>{{{content}}}</li>
        <li>{{{content_highlighted}}}</li>
        <li>{{{highlights}}}</li>
        <li class="highlight-item">
            <ul class="highlight-sublist">
                <li>{{{text}}}</li>
                <li>{{{image_url}}}</li>
                <li>{{{cubox_url}}}</li>
                <li>{{{note}}}</li>
                <li>{{{color}}}</li>
                <li>{{{create_time}}}</li>
            </ul>
        </li>
        <li>{{{tags}}}</li>
        <li>{{{create_time}}}</li>
        <li>{{{update_time}}}</li>
        <li>{{{domain}}}</li>
        <li>{{{url}}}</li>
        <li>{{{cubox_url}}}</li>
        <li>{{{words_count}}}</li>
    </ul>
    <div class="cubox-reference domain-reference-content"></div>
</div>
`; 

export const cuboxDateFormat = `
If date is used on above templates, enter the format date.

<div class="cubox-variables-container">
    <div class="cubox-variables-title">Example</div>
    <ul class="cubox-variables-list">
        <li>yyyy-MM-dd</li>
        <li>MM/dd/yyyy</li>
        <li>dd.MM.yyyy</li>
        <li>yyyy-MM-dd HH:mm:ss</li>
    </ul>
    <div class="cubox-reference domain-reference-date"></div>
</div>
`; 