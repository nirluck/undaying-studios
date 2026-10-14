import { mount } from 'svelte';
import '../../shared/styles/fonts.css';
import './lib/panel.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
