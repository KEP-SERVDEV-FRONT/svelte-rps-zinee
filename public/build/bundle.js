
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.4' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.29.4 */

    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-8938xp-style";
    	style.textContent = ".inner.svelte-8938xp.svelte-8938xp{display:flex;width:100%;height:100vh}.inner.svelte-8938xp .com.svelte-8938xp{display:flex;justify-content:center;align-items:center;flex:1}.inner.svelte-8938xp .me.svelte-8938xp{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;flex:1}.inner.svelte-8938xp .me .btn-area.svelte-8938xp{position:absolute;bottom:10vh;left:0;right:0;text-align:center}.game-title.svelte-8938xp.svelte-8938xp{position:fixed;top:10vh;left:0;right:0;padding:10px;font-size:2em;text-align:center;z-index:1}.game-title.svelte-8938xp span.svelte-8938xp{display:block;font-size:14px;font-weight:400}.result.svelte-8938xp.svelte-8938xp{position:fixed;top:0;bottom:0;left:0;right:0;display:flex;flex-direction:column;background:rgba(0, 0, 0, 0.1);z-index:10}.result.svelte-8938xp .txt.svelte-8938xp{padding-top:40vh;font-size:10em;font-weight:700;text-align:center}.result.svelte-8938xp .txt.error.svelte-8938xp{color:red;text-shadow:3px 3px 7px rgba(0, 0, 0, 0.3)}.result.svelte-8938xp .btn-retry.svelte-8938xp{padding:1em 0;font-size:2em;font-weight:500;background:#fff}.result.svelte-8938xp .btn-retry.svelte-8938xp:hover{background:#ddd}.loser.svelte-8938xp.svelte-8938xp{background:rgba(255, 0, 0, 0.1)}.winner.svelte-8938xp.svelte-8938xp{background:rgba(255, 255, 0, 0.1)}h2.svelte-8938xp.svelte-8938xp{font-size:10em}button.svelte-8938xp.svelte-8938xp{font-size:5em}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICAgIGxldCBsaWZlID0gNVxuICAgIGxldCBkaXNhYmxlZCA9IGZhbHNlXG4gICAgbGV0IG51bSA9IHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAzKVxuICAgIGxldCBjb21wdXRlciA9ICcnXG4gICAgbGV0IGNvbV9wcmludCA9ICcnXG4gICAgbGV0IG15X3ByaW50ID0gJ/CfkYAnXG4gICAgbGV0IHJlc3VsdCA9ICcnXG4gICAgbGV0IHVzZXJuYW1lID0gJ+yngOuLiCdcblxuICAgIGZ1bmN0aW9uIEFDVElPTigpIHtcbiAgICAgICAgbnVtID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDMpXG4gICAgICAgIGlmIChudW0gPT09IDApIHtcbiAgICAgICAgICAgIGNvbXB1dGVyID0gJ+qwgOychCdcbiAgICAgICAgICAgIGNvbV9wcmludCA9ICfinIzvuI8nXG4gICAgICAgIH0gZWxzZSBpZiAobnVtID09PSAxKSB7XG4gICAgICAgICAgICBjb21wdXRlciA9ICfrsJTsnIQnXG4gICAgICAgICAgICBjb21fcHJpbnQgPSAn4pyKJ1xuICAgICAgICB9IGVsc2UgaWYgKG51bSA9PT0gMikge1xuICAgICAgICAgICAgY29tcHV0ZXIgPSAn67O0J1xuICAgICAgICAgICAgY29tX3ByaW50ID0gJ/CflpAnXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBTRU5EKG15KSB7XG4gICAgICAgIGRpc2FibGVkID0gdHJ1ZVxuXG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpXG5cbiAgICAgICAgaWYgKG15ID09PSAn6rCA7JyEJykgbXlfcHJpbnQgPSAn4pyM77iPJ1xuICAgICAgICBlbHNlIGlmIChteSA9PT0gJ+uwlOychCcpIG15X3ByaW50ID0gJ+KciidcbiAgICAgICAgZWxzZSBpZiAobXkgPT09ICfrs7QnKSBteV9wcmludCA9ICfwn5aQJ1xuXG4gICAgICAgIGp1ZGdtZW50KG15KVxuXG4gICAgICAgIGlmIChsaWZlID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHQgPSAnR0FNRSBPVkVSJ1xuICAgICAgICAgICAgZGlzYWJsZWQgPSB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBqdWRnbWVudChteSkge1xuICAgICAgICBpZiAoY29tcHV0ZXIgPT09IG15KSB7XG4gICAgICAgICAgICByZXN1bHQgPSAn67mE6rmAISdcbiAgICAgICAgICAgIGxpZmUtLVxuICAgICAgICB9IGVsc2UgaWYgKGNvbXB1dGVyID09PSAn6rCA7JyEJyAmJiBteSA9PT0gJ+uwlOychCcpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHVzZXJuYW1lICsgJ+yKuSEnXG4gICAgICAgICAgICBsaWZlKytcbiAgICAgICAgfSBlbHNlIGlmIChjb21wdXRlciA9PT0gJ+uwlOychCcgJiYgbXkgPT09ICfrs7QnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB1c2VybmFtZSArICfsirkhJ1xuICAgICAgICAgICAgbGlmZSsrXG5cbiAgICAgICAgfSBlbHNlIGlmIChjb21wdXRlciA9PT0gJ+uztCcgJiYgbXkgPT09ICfqsIDsnIQnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB1c2VybmFtZSArICfsirkhJ1xuICAgICAgICAgICAgbGlmZSsrXG4gICAgICAgIH0gZWxzZSBpZiAoY29tcHV0ZXIgPT09ICfqsIDsnIQnICYmIG15ID09PSAn67O0Jykge1xuICAgICAgICAgICAgcmVzdWx0ID0gdXNlcm5hbWUgKyAn7YyoISdcbiAgICAgICAgICAgIGxpZmUtLVxuICAgICAgICB9IGVsc2UgaWYgKGNvbXB1dGVyID09PSAn67CU7JyEJyAmJiBteSA9PT0gJ+qwgOychCcpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHVzZXJuYW1lICsgJ+2MqCEnXG4gICAgICAgICAgICBsaWZlLS1cbiAgICAgICAgfSBlbHNlIGlmIChjb21wdXRlciA9PT0gJ+uztCcgJiYgbXkgPT09ICfrsJTsnIQnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSB1c2VybmFtZSArICftjKghJ1xuICAgICAgICAgICAgbGlmZS0tXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXRyeSgpIHtcbiAgICAgICAgZGlzYWJsZWQgPSBmYWxzZVxuICAgICAgICByZXN1bHQgPSAnJ1xuICAgICAgICBteV9wcmludCA9ICfwn5GAJ1xuICAgICAgICB0aW1lciA9IHNldEludGVydmFsKEFDVElPTiwgMTAwKVxuICAgIH1cblxuICAgIGxldCB0aW1lciA9IHNldEludGVydmFsKEFDVElPTiwgMTAwKVxuPC9zY3JpcHQ+XG5cbjxkaXYgY2xhc3M9XCJ3cmFwcGVyXCI+XG5cdDxoMSBjbGFzcz1cImdhbWUtdGl0bGVcIj7qsIDsnITrsJTsnITrs7Q8c3Bhbj7rgqjsnYAg66qp7IioIDogeyBsaWZlIH08L3NwYW4+PC9oMT5cblxuXHR7I2lmIHJlc3VsdH1cblx0XHQ8ZGl2IGNsYXNzPVwicmVzdWx0XCI+XG5cdFx0XHR7I2lmIGxpZmUgPiAwfVxuXHRcdFx0XHQ8cCBjbGFzcz1cInR4dFwiPnsgcmVzdWx0IH08L3A+XG5cdFx0XHRcdDxidXR0b24gY2xhc3M9XCJidG4tcmV0cnlcIiBvbjpjbGljaz1cInsoKSA9PiByZXRyeSgpfVwiPu2VnCDrsogg642UITwvYnV0dG9uPlxuXHRcdFx0ezplbHNlfVxuXHRcdFx0XHQ8cCBjbGFzcz1cInR4dCBlcnJvclwiPnsgcmVzdWx0IH08L3A+XG5cdFx0XHR7L2lmfVxuXHRcdDwvZGl2PlxuXHR7L2lmfVxuXG5cdDxkaXYgY2xhc3M9XCJpbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJjb20gbG9zZXJcIj5cblx0XHRcdDxoMj57IGNvbV9wcmludCB9PC9oMj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibWUgd2lubmVyXCI+XG5cdFx0XHQ8aDI+eyBteV9wcmludCB9PC9oMj5cblx0XHRcdDxkaXYgY2xhc3M9XCJidG4tYXJlYVwiPlxuXHRcdFx0XHQ8YnV0dG9uIG9uOmNsaWNrPXsoKSA9PiBTRU5EKCfqsIDsnIQnKX0geyBkaXNhYmxlZCB9PuKcjO+4jzwvYnV0dG9uPlxuXHRcdFx0XHQ8YnV0dG9uIG9uOmNsaWNrPXsoKSA9PiBTRU5EKCfrsJTsnIQnKX0geyBkaXNhYmxlZCB9PuKcijwvYnV0dG9uPlxuXHRcdFx0XHQ8YnV0dG9uIG9uOmNsaWNrPXsoKSA9PiBTRU5EKCfrs7QnKX0geyBkaXNhYmxlZCB9PvCflpA8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG4gICAgLmlubmVyIHtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICAgIGhlaWdodDogMTAwdmg7XG4gICAgfVxuXG4gICAgLmlubmVyIC5jb20ge1xuICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgZmxleDogMTtcbiAgICB9XG5cbiAgICAuaW5uZXIgLm1lIHtcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgICAgZmxleDogMTtcbiAgICB9XG5cbiAgICAuaW5uZXIgLm1lIC5idG4tYXJlYSB7XG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgYm90dG9tOiAxMHZoO1xuICAgICAgICBsZWZ0OiAwO1xuICAgICAgICByaWdodDogMDtcbiAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIH1cblxuICAgIC5nYW1lLXRpdGxlIHtcbiAgICAgICAgcG9zaXRpb246IGZpeGVkO1xuICAgICAgICB0b3A6IDEwdmg7XG4gICAgICAgIGxlZnQ6IDA7XG4gICAgICAgIHJpZ2h0OiAwO1xuICAgICAgICBwYWRkaW5nOiAxMHB4O1xuICAgICAgICBmb250LXNpemU6IDJlbTtcbiAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgICAgICB6LWluZGV4OiAxO1xuICAgIH1cblxuICAgIC5nYW1lLXRpdGxlIHNwYW4ge1xuICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICBmb250LXdlaWdodDogNDAwO1xuICAgIH1cblxuICAgIC5yZXN1bHQge1xuICAgICAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgICAgIHRvcDogMDtcbiAgICAgICAgYm90dG9tOiAwO1xuICAgICAgICBsZWZ0OiAwO1xuICAgICAgICByaWdodDogMDtcbiAgICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgICAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjEpO1xuICAgICAgICB6LWluZGV4OiAxMDtcbiAgICB9XG5cbiAgICAucmVzdWx0IC50eHQge1xuICAgICAgICBwYWRkaW5nLXRvcDogNDB2aDtcbiAgICAgICAgZm9udC1zaXplOiAxMGVtO1xuICAgICAgICBmb250LXdlaWdodDogNzAwO1xuICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgfVxuXG4gICAgLnJlc3VsdCAudHh0LmVycm9yIHtcbiAgICAgICAgY29sb3I6IHJlZDtcbiAgICAgICAgdGV4dC1zaGFkb3c6IDNweCAzcHggN3B4IHJnYmEoMCwgMCwgMCwgMC4zKTtcbiAgICB9XG5cbiAgICAucmVzdWx0IC5idG4tcmV0cnkge1xuICAgICAgICBwYWRkaW5nOiAxZW0gMDtcbiAgICAgICAgZm9udC1zaXplOiAyZW07XG4gICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICAgIGJhY2tncm91bmQ6ICNmZmY7XG4gICAgfVxuXG4gICAgLnJlc3VsdCAuYnRuLXJldHJ5OmhvdmVyIHtcbiAgICAgICAgYmFja2dyb3VuZDogI2RkZDtcbiAgICB9XG5cbiAgICAubG9zZXIge1xuICAgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMCwgMCwgMC4xKTtcbiAgICB9XG5cbiAgICAud2lubmVyIHtcbiAgICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMCwgMC4xKTtcbiAgICB9XG5cbiAgICBoMiB7XG4gICAgICAgIGZvbnQtc2l6ZTogMTBlbTtcbiAgICB9XG5cbiAgICBidXR0b24ge1xuICAgICAgICBmb250LXNpemU6IDVlbTtcbiAgICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTJHSSxNQUFNLDRCQUFDLENBQUMsQUFDSixPQUFPLENBQUUsSUFBSSxDQUNiLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLEtBQUssQUFDakIsQ0FBQyxBQUVELG9CQUFNLENBQUMsSUFBSSxjQUFDLENBQUMsQUFDVCxPQUFPLENBQUUsSUFBSSxDQUNiLGVBQWUsQ0FBRSxNQUFNLENBQ3ZCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLElBQUksQ0FBRSxDQUFDLEFBQ1gsQ0FBQyxBQUVELG9CQUFNLENBQUMsR0FBRyxjQUFDLENBQUMsQUFDUixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLGVBQWUsQ0FBRSxNQUFNLENBQ3ZCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLElBQUksQ0FBRSxDQUFDLEFBQ1gsQ0FBQyxBQUVELG9CQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsY0FBQyxDQUFDLEFBQ2xCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE1BQU0sQ0FBRSxJQUFJLENBQ1osSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsQ0FBQyxDQUNSLFVBQVUsQ0FBRSxNQUFNLEFBQ3RCLENBQUMsQUFFRCxXQUFXLDRCQUFDLENBQUMsQUFDVCxRQUFRLENBQUUsS0FBSyxDQUNmLEdBQUcsQ0FBRSxJQUFJLENBQ1QsSUFBSSxDQUFFLENBQUMsQ0FDUCxLQUFLLENBQUUsQ0FBQyxDQUNSLE9BQU8sQ0FBRSxJQUFJLENBQ2IsU0FBUyxDQUFFLEdBQUcsQ0FDZCxVQUFVLENBQUUsTUFBTSxDQUNsQixPQUFPLENBQUUsQ0FBQyxBQUNkLENBQUMsQUFFRCx5QkFBVyxDQUFDLElBQUksY0FBQyxDQUFDLEFBQ2QsT0FBTyxDQUFFLEtBQUssQ0FDZCxTQUFTLENBQUUsSUFBSSxDQUNmLFdBQVcsQ0FBRSxHQUFHLEFBQ3BCLENBQUMsQUFFRCxPQUFPLDRCQUFDLENBQUMsQUFDTCxRQUFRLENBQUUsS0FBSyxDQUNmLEdBQUcsQ0FBRSxDQUFDLENBQ04sTUFBTSxDQUFFLENBQUMsQ0FDVCxJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxDQUFDLENBQ1IsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsTUFBTSxDQUN0QixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDOUIsT0FBTyxDQUFFLEVBQUUsQUFDZixDQUFDLEFBRUQscUJBQU8sQ0FBQyxJQUFJLGNBQUMsQ0FBQyxBQUNWLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLEdBQUcsQ0FDaEIsVUFBVSxDQUFFLE1BQU0sQUFDdEIsQ0FBQyxBQUVELHFCQUFPLENBQUMsSUFBSSxNQUFNLGNBQUMsQ0FBQyxBQUNoQixLQUFLLENBQUUsR0FBRyxDQUNWLFdBQVcsQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUMvQyxDQUFDLEFBRUQscUJBQU8sQ0FBQyxVQUFVLGNBQUMsQ0FBQyxBQUNoQixPQUFPLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FDZCxTQUFTLENBQUUsR0FBRyxDQUNkLFdBQVcsQ0FBRSxHQUFHLENBQ2hCLFVBQVUsQ0FBRSxJQUFJLEFBQ3BCLENBQUMsQUFFRCxxQkFBTyxDQUFDLHdCQUFVLE1BQU0sQUFBQyxDQUFDLEFBQ3RCLFVBQVUsQ0FBRSxJQUFJLEFBQ3BCLENBQUMsQUFFRCxNQUFNLDRCQUFDLENBQUMsQUFDSixVQUFVLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFDcEMsQ0FBQyxBQUVELE9BQU8sNEJBQUMsQ0FBQyxBQUNMLFVBQVUsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUN0QyxDQUFDLEFBRUQsRUFBRSw0QkFBQyxDQUFDLEFBQ0EsU0FBUyxDQUFFLElBQUksQUFDbkIsQ0FBQyxBQUVELE1BQU0sNEJBQUMsQ0FBQyxBQUNKLFNBQVMsQ0FBRSxHQUFHLEFBQ2xCLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    // (81:1) {#if result}
    function create_if_block(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*life*/ ctx[0] > 0) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "result svelte-8938xp");
    			add_location(div, file, 81, 2, 1965);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(81:1) {#if result}",
    		ctx
    	});

    	return block;
    }

    // (86:3) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*result*/ ctx[4]);
    			attr_dev(p, "class", "txt error svelte-8938xp");
    			add_location(p, file, 86, 4, 2126);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 16) set_data_dev(t, /*result*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(86:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (83:3) {#if life > 0}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(/*result*/ ctx[4]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "한 번 더!";
    			attr_dev(p, "class", "txt svelte-8938xp");
    			add_location(p, file, 83, 4, 2008);
    			attr_dev(button, "class", "btn-retry svelte-8938xp");
    			add_location(button, file, 84, 4, 2042);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 16) set_data_dev(t0, /*result*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(83:3) {#if life > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let h1;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let div3;
    	let div0;
    	let h20;
    	let t5;
    	let t6;
    	let div2;
    	let h21;
    	let t7;
    	let t8;
    	let div1;
    	let button0;
    	let t9;
    	let t10;
    	let button1;
    	let t11;
    	let t12;
    	let button2;
    	let t13;
    	let mounted;
    	let dispose;
    	let if_block = /*result*/ ctx[4] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			h1 = element("h1");
    			t0 = text("가위바위보");
    			span = element("span");
    			t1 = text("남은 목숨 : ");
    			t2 = text(/*life*/ ctx[0]);
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			div3 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			t5 = text(/*com_print*/ ctx[2]);
    			t6 = space();
    			div2 = element("div");
    			h21 = element("h2");
    			t7 = text(/*my_print*/ ctx[3]);
    			t8 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t9 = text("✌️");
    			t10 = space();
    			button1 = element("button");
    			t11 = text("✊");
    			t12 = space();
    			button2 = element("button");
    			t13 = text("🖐");
    			attr_dev(span, "class", "svelte-8938xp");
    			add_location(span, file, 78, 29, 1913);
    			attr_dev(h1, "class", "game-title svelte-8938xp");
    			add_location(h1, file, 78, 1, 1885);
    			attr_dev(h20, "class", "svelte-8938xp");
    			add_location(h20, file, 93, 3, 2238);
    			attr_dev(div0, "class", "com loser svelte-8938xp");
    			add_location(div0, file, 92, 2, 2211);
    			attr_dev(h21, "class", "svelte-8938xp");
    			add_location(h21, file, 96, 3, 2299);
    			button0.disabled = /*disabled*/ ctx[1];
    			attr_dev(button0, "class", "svelte-8938xp");
    			add_location(button0, file, 98, 4, 2351);
    			button1.disabled = /*disabled*/ ctx[1];
    			attr_dev(button1, "class", "svelte-8938xp");
    			add_location(button1, file, 99, 4, 2416);
    			button2.disabled = /*disabled*/ ctx[1];
    			attr_dev(button2, "class", "svelte-8938xp");
    			add_location(button2, file, 100, 4, 2480);
    			attr_dev(div1, "class", "btn-area svelte-8938xp");
    			add_location(div1, file, 97, 3, 2324);
    			attr_dev(div2, "class", "me winner svelte-8938xp");
    			add_location(div2, file, 95, 2, 2272);
    			attr_dev(div3, "class", "inner svelte-8938xp");
    			add_location(div3, file, 91, 1, 2189);
    			attr_dev(div4, "class", "wrapper");
    			add_location(div4, file, 77, 0, 1862);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div4, t3);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h20);
    			append_dev(h20, t5);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, h21);
    			append_dev(h21, t7);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, t9);
    			append_dev(div1, t10);
    			append_dev(div1, button1);
    			append_dev(button1, t11);
    			append_dev(div1, t12);
    			append_dev(div1, button2);
    			append_dev(button2, t13);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[9], false, false, false),
    					listen_dev(button2, "click", /*click_handler_3*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*life*/ 1) set_data_dev(t2, /*life*/ ctx[0]);

    			if (/*result*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div4, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*com_print*/ 4) set_data_dev(t5, /*com_print*/ ctx[2]);
    			if (dirty & /*my_print*/ 8) set_data_dev(t7, /*my_print*/ ctx[3]);

    			if (dirty & /*disabled*/ 2) {
    				prop_dev(button0, "disabled", /*disabled*/ ctx[1]);
    			}

    			if (dirty & /*disabled*/ 2) {
    				prop_dev(button1, "disabled", /*disabled*/ ctx[1]);
    			}

    			if (dirty & /*disabled*/ 2) {
    				prop_dev(button2, "disabled", /*disabled*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let life = 5;
    	let disabled = false;
    	let num = parseInt(Math.random() * 3);
    	let computer = "";
    	let com_print = "";
    	let my_print = "👀";
    	let result = "";
    	let username = "지니";

    	function ACTION() {
    		num = parseInt(Math.random() * 3);

    		if (num === 0) {
    			computer = "가위";
    			$$invalidate(2, com_print = "✌️");
    		} else if (num === 1) {
    			computer = "바위";
    			$$invalidate(2, com_print = "✊");
    		} else if (num === 2) {
    			computer = "보";
    			$$invalidate(2, com_print = "🖐");
    		}
    	}

    	function SEND(my) {
    		$$invalidate(1, disabled = true);
    		clearInterval(timer);
    		if (my === "가위") $$invalidate(3, my_print = "✌️"); else if (my === "바위") $$invalidate(3, my_print = "✊"); else if (my === "보") $$invalidate(3, my_print = "🖐");
    		judgment(my);

    		if (life === 0) {
    			$$invalidate(4, result = "GAME OVER");
    			$$invalidate(1, disabled = true);
    		}
    	}

    	function judgment(my) {
    		if (computer === my) {
    			$$invalidate(4, result = "비김!");
    			$$invalidate(0, life--, life);
    		} else if (computer === "가위" && my === "바위") {
    			$$invalidate(4, result = username + "승!");
    			$$invalidate(0, life++, life);
    		} else if (computer === "바위" && my === "보") {
    			$$invalidate(4, result = username + "승!");
    			$$invalidate(0, life++, life);
    		} else if (computer === "보" && my === "가위") {
    			$$invalidate(4, result = username + "승!");
    			$$invalidate(0, life++, life);
    		} else if (computer === "가위" && my === "보") {
    			$$invalidate(4, result = username + "패!");
    			$$invalidate(0, life--, life);
    		} else if (computer === "바위" && my === "가위") {
    			$$invalidate(4, result = username + "패!");
    			$$invalidate(0, life--, life);
    		} else if (computer === "보" && my === "바위") {
    			$$invalidate(4, result = username + "패!");
    			$$invalidate(0, life--, life);
    		}
    	}

    	function retry() {
    		$$invalidate(1, disabled = false);
    		$$invalidate(4, result = "");
    		$$invalidate(3, my_print = "👀");
    		timer = setInterval(ACTION, 100);
    	}

    	let timer = setInterval(ACTION, 100);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => retry();
    	const click_handler_1 = () => SEND("가위");
    	const click_handler_2 = () => SEND("바위");
    	const click_handler_3 = () => SEND("보");

    	$$self.$capture_state = () => ({
    		life,
    		disabled,
    		num,
    		computer,
    		com_print,
    		my_print,
    		result,
    		username,
    		ACTION,
    		SEND,
    		judgment,
    		retry,
    		timer
    	});

    	$$self.$inject_state = $$props => {
    		if ("life" in $$props) $$invalidate(0, life = $$props.life);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("num" in $$props) num = $$props.num;
    		if ("computer" in $$props) computer = $$props.computer;
    		if ("com_print" in $$props) $$invalidate(2, com_print = $$props.com_print);
    		if ("my_print" in $$props) $$invalidate(3, my_print = $$props.my_print);
    		if ("result" in $$props) $$invalidate(4, result = $$props.result);
    		if ("username" in $$props) username = $$props.username;
    		if ("timer" in $$props) timer = $$props.timer;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		life,
    		disabled,
    		com_print,
    		my_print,
    		result,
    		SEND,
    		retry,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-8938xp-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
